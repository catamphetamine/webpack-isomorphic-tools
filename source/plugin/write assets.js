import fs     from 'fs-extra'
import path   from 'path'

import Require_hacker from 'require-hacker'
import serialize      from '../tools/serialize-javascript'

import { exists, clone, replace_all } from '../helpers'

// writes webpack-assets.json file, which contains assets' file paths
export default function write_assets(json, options, log)
{
	// take the passed in options
	options = clone(options)

	// make webpack stats accessible for asset functions (parser, naming, filter)
	options.webpack_stats = json

	log.debug('running write assets webpack plugin')

	const development = options.development

	if (development)
	{
		log.debug(' (development mode is on)')
	}

	// write webpack stats json for debugging purpose
	if (options.debug)
	{
		// path to webpack stats file
		const webpack_stats_file_path = get_webpack_stats_file_path(options.webpack_assets_path)

		// write webpack stats file
		log.debug(`writing webpack stats to ${webpack_stats_file_path}`)
		// format the JSON for better readability in development mode
		const webpack_stats_json = development ? JSON.stringify(json, null, 2) : JSON.stringify(json)
		// write the file
		fs.outputFileSync(webpack_stats_file_path, webpack_stats_json)
	}

	// the output object with assets
	const output = options.output

	// populate the output object with assets
	populate_assets(output, json, options, log)

	// write webpack assets info file
	log.debug(`writing webpack assets info to ${options.webpack_assets_path}`)
	// format the JSON for better readability if in debug mode
	const assets_info = development ? JSON.stringify(output, null, 2) : JSON.stringify(output)
	// write the file
	fs.outputFileSync(options.webpack_assets_path, assets_info)
}

// populates the output object with assets
function populate_assets(output, json, options, log)
{
	// for each chunk name ("main", "common", ...)
	Object.keys(json.assetsByChunkName).forEach(function(name)
	{
		log.debug(`getting javascript and styles for chunk "${name}"`)

		// get javascript chunk real file path

		const javascript = get_assets(name, 'js')[0]
		// the second asset is usually a source map

		if (javascript)
		{
			log.debug(` (got javascript)`)
			output.javascript[name] = javascript
		}

		// get style chunk real file path

		const style = get_assets(name, 'css')[0]
		// the second asset is usually a source map

		if (style)
		{
			log.debug(` (got style)`)
			output.styles[name] = style
		}
	})

	// gets asset paths by name and extension of their chunk
	function get_assets(name, extension = 'js')
	{
		let chunk = json.assetsByChunkName[name]
	
		// a chunk could be a string or an array, so make sure it is an array
		if (!(Array.isArray(chunk)))
		{
			chunk = [chunk]
		}
	
		return chunk
			// filter by extension
			.filter(name => path.extname(name) === `.${extension}`)
			// adjust the real path (can be http, filesystem)
			.map(name => options.assets_base_url + name)
	}

	// // output assets for all application javascript entry points
	// Object.keys(this.options.entry).forEach(chunk_name =>
	// {
	// 	let entry = this.options.entry[chunk_name]
	// 	if (Array.isArray(entry))
	// 	{
	// 		entry = entry[entry.length - 1]
	// 	}
	//
	// 	output.javascript[entry] = get_assets(chunk_name, 'js')[0]
	// 	// the second asset is usually a source map
	// })

	// // omit node_modules contents and internal webpack modules
	// const modules = json.modules.filter(module =>
	// {
	// 	return module.name.indexOf('.') === 0 && module.name.indexOf('./~/') !== 0
	// 	// return module.name.indexOf('./~/') !== 0 && module.name.indexOf('(webpack)') !== 0
	// })

	// one can supply a custom filter
	const default_filter = (module, regular_expression) => regular_expression.test(module.name)
	// one can supply a custom namer
	const default_asset_path = (module) => module.name
	// one can supply a custom parser
	const default_parser = (module) => module.source

	// 1st pass
	const parsed_assets = {}

	// global paths to parsed asset paths
	const global_paths_to_parsed_asset_paths = {}

	// for each user specified asset type
	for (let asset_type of Object.keys(options.assets))
	{
		const asset_description = options.assets[asset_type]

		// one can supply his own filter
		const filter = (asset_description.filter || default_filter) //.bind(this)
		// one can supply his own path parser
		const extract_asset_path = (asset_description.path || default_asset_path) //.bind(this)
		// one can supply his own parser
		const parser = (asset_description.parser || default_parser) //.bind(this)

		// guard agains typos, etc
		
		// for filter
		if (!asset_description.filter)
		{
			log.debug(`No filter specified for "${asset_type}" assets. Using a default one.`)
		}
		
		// for path parser
		if (!asset_description.path)
		{
			log.debug(`No path parser specified for "${asset_type}" assets. Using a default one.`)
		}
		
		// for parser
		if (!asset_description.parser)
		{
			log.debug(`No parser specified for "${asset_type}" assets. Using a default one.`)
		}

		log.debug(`parsing assets of type "${asset_type}"`)

		// timer start
		const began_at = new Date().getTime()

		// get real paths for all the files from this asset type
		json.modules
			// take just modules of this asset type
			.filter(module => 
			{
				// check that this asset is of the asset type
				if (!filter(module, options.regular_expressions[asset_type], options, log))
				{
					return false
				}

				// guard against an empty source.
				if (!module.source)
				{
					log.error(`Module "${module.name}" has no source. Maybe Webpack compilation of this module failed. Skipping this asset.`)
					return false
				}

				// include this asset
				return true
			})
			.reduce((set, module) =>
			{
				// determine asset real path
				const asset_path = extract_asset_path(module, options, log)

				// (no need to resolve require() paths because it just works as is)
				//
				// const resolve_require_paths = (module_source) =>
				// {
				// 	return module_source.replace(/(\s)require\("([^"]+)"\)/g, function(match, space_before, required_path)
				// 	{
				// 		const asset_folder = path.dirname(asset_path)
				// 		const required_file_path = path.join(asset_folder, required_path)
				//
				// 		const required_file_absolute_path = path.resolve(options.project_folder, required_file_path)
				// 		const node_modules_path = path.join(options.project_folder, 'node_modules')
				//
				// 		// if it's a require() call for a file inside "node_modules",
				// 		// then adjust the required path accordingly
				// 		if (required_file_absolute_path.indexOf(node_modules_path) === 0)
				// 		{
				// 			// account for the last '/'
				// 			required_path = required_path.slice(node_modules_path.length + 1)
				// 		}
				// 		else
				// 		{
				// 			required_path = './' + replace_all(required_file_path, path.sep, '/')
				// 		}
				//
				// 		return space_before + `require("${required_path}")`
				// 	})
				// }

				// asset module source, or asset content (or whatever else)
				const parsed_asset = parser(module, options, log)

				log.trace(`Adding assset "${asset_path}", module id ${module.id} (in webpack-stats.debug.json)`)

				// check for naming collisions (just in case)
				if (exists(set[asset_path]))
				{
					log.error('-----------------------------------------------------------------')
					log.error(`Asset with path "${asset_path}" was overwritten because of path collision.`)
					log.error(`Use the "filter" function of this asset type to narrow the results.`)
					log.error(`Previous asset with this path:`)
					log.error(set[asset_path])
					log.error(`New asset with this path:`)
					log.error(parsed_asset)
					log.error('-----------------------------------------------------------------')
				}

				// add this asset to the list
				set[asset_path] = parsed_asset

				// add path mapping
				global_paths_to_parsed_asset_paths[path.resolve(options.project_path, asset_path)] = asset_path

				// continue
				return set
			},
			parsed_assets)

		// timer stop
		log.debug(` time taken: ${new Date().getTime() - began_at} ms`)
	}

	// instantiate require() hooker
	const require_hacker = new Require_hacker({ debug: options.debug })

	// register a special require() hook for requiring() raw webpack modules
	const require_hook = require_hacker.resolver('webpack-module', (required_path, flush_cache) =>
	{
		// find an asset with this path
		if (exists(global_paths_to_parsed_asset_paths[required_path]))
		{
			return parsed_assets[global_paths_to_parsed_asset_paths[required_path]]
		}

		// find a webpack module which has a reason with this path
		for (let module of json.modules)
		{
			for (let reason of module.reasons)
			{
				if (reason.userRequest === required_path)
				{
					return module.source
				}
			}
		}
	},
	{ precede_node_loader: true })

	log.debug(`compiling assets`)

	// timer start
	const began_at = new Date().getTime()

	// evaluate parsed assets source code
	for (let asset_path of Object.keys(parsed_assets))
	{
		// set asset value
		output.assets[asset_path] = require(path.resolve(options.project_path, asset_path))
	}

	// unmount the previously installed require() hook
	require_hook.unmount()

	// timer stop
	log.debug(` time taken: ${new Date().getTime() - began_at} ms`)
}

function get_webpack_stats_file_path(webpack_assets_file_path)
{
	// default webpack stats file name
	let webpack_stats_file_name = 'webpack-stats.json'

	// resolve a possible file name collision
	if (path.basename(webpack_assets_file_path) === webpack_stats_file_name)
	{
		webpack_stats_file_name = 'webpack-stats.debug.json'
	}

	// path to webpack stats file
	return path.resolve(path.dirname(webpack_assets_file_path), webpack_stats_file_name)
}