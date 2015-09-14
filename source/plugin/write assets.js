import fs     from 'fs'
import path   from 'path'
import mkdirp from 'mkdirp'

import { clone } from '../helpers'

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

	// create all the folders in the path if they don't exist
	mkdirp.sync(path.dirname(options.webpack_assets_path))

	// in debug mode, write webpack stats json for debugging purpose
	if (options.debug)
	{
		const webpack_stats_file_path = path.resolve(path.dirname(options.webpack_assets_path), 'webpack-stats.debug.json')

		// write webpack stats file
		log.debug(`writing webpack stats to ${webpack_stats_file_path}`)
		// write the file (format the JSON for readability)
		fs.writeFileSync(webpack_stats_file_path, JSON.stringify(json, null, 2))
	}

	// the output object with assets
	const output = options.output

	// populate the output object with assets
	populate_assets(output, json, options, log)

	// write webpack assets info file
	log.debug(`writing webpack assets info to ${options.webpack_assets_path}`)
	// format the JSON for readability if in debug mode
	const assets_info = development ? JSON.stringify(output, null, 2) : JSON.stringify(output)
	// write the file
	fs.writeFileSync(options.webpack_assets_path, assets_info)
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
			.map(name => options.assets_base_path + name)
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
	const default_naming = (module) => module.name

	// for each user specified asset type
	for (let asset_type of Object.keys(options.assets))
	{
		const asset_description = options.assets[asset_type]

		// one can supply his own filter
		const filter = (asset_description.filter || default_filter) //.bind(this)
		// one can supply his own parser
		const parser = asset_description.parser //.bind(this)
		// one can supply his own namer
		const naming = (asset_description.naming || default_naming) //.bind(this)

		// parser is required
		if (!asset_description.parser)
		{
			throw new Error(`"parser" function is required for assets type "${asset_type}". See the Configuration section of the README for explanation.`)
		}

		log.debug(`populating assets of type "${asset_type}"`)

		// timer start
		const began_at = new Date().getTime()

		// initialization
		output[asset_type] = output[asset_type] || {}

		// get real paths for all the files from this asset type
		json.modules
			// take just modules of this asset type
			.filter(module => filter(module, options.regular_expressions[asset_type], options, log))
			.reduce((set, module) =>
			{
				// determine asset name
				const name = naming(module, options, log)
				// determine and set the real file path for the asset
				set[name] = parser(module, options, log) // || ''
				// continue
				return set
			},
			output[asset_type])

		// timer stop
		log.debug(` time taken: ${new Date().getTime() - began_at} ms`)
	}
}