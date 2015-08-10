import fs     from 'fs'
import path   from 'path'
import mkdirp from 'mkdirp'

// writes webpack-stats.json file, which contains assets' file paths
export default function write_stats(stats, options)
{
	const _production_  = options.environment === 'production'
	const _development_ = options.environment === 'development'

	const json = stats.toJson()

	const output_path = this.options.output.publicPath
	const output = {}

	// to see all webpack stats (for debuggin purpose)
	// output.json = json

	const resolve_asset_path = asset_path => this.options.output.publicPath + asset_path
	// {
	// 	if (_development_)
	// 	{
	// 		// path.resolve doesn't work for Http protocol
	// 		return this.options.output.publicPath + asset_path
	// 	}
	// 	else
	// 	{
	// 		return path.resolve(this.options.output.path, asset_path)
	// 	}
	// }

	output.javascript = {}
	output.styles = {}

	// for each chunk name ("main", "common", ...)
	Object.keys(json.assetsByChunkName).forEach(function(name)
	{
		// get javascript chunk real file path

		const javascript = get_assets(name, 'js')[0]
		// the second asset is usually a source map

		if (javascript)
		{
			output.javascript[name] = javascript
		}

		// get style chunk real file path

		const style = get_assets(name, 'css')[0]
		// the second asset is usually a source map

		if (style)
		{
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
			.map(name => resolve_asset_path(name))
	}

	// // output stats for all application javascript entry points
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

	// omit node_modules contents and internal webpack modules
	const modules = json.modules.filter(module =>
	{
		return module.name.indexOf('./~/') !== 0 && module.name.indexOf('(webpack)') !== 0
	})

	// one can supply a custom filter
	const default_filter = (asset, regular_expression) => regular_expression.test(asset.name)

	// for each user specified asset type
	Object.keys(options.assets).forEach(asset_type =>
	{
		// user settings for this asset type
		const asset_description = options.assets[asset_type]

		// one can supply his own filter
		const filter = (asset_description.filter || default_filter).bind(this)
		// one can supply his own path_parser
		const path_parser = asset_description.path_parser.bind(this)

		// path_parser is required
		if (!asset_description.path_parser)
		{
			throw new Error(`path_parser required for asset type "${asset_type}"`)
		}

		// get real paths for all the files from this asset type
		output[asset_type] = modules
			// take just modules of this asset type
			.filter(module => filter(module, options.regular_expressions[asset_type], options))
			.reduce((set, module) =>
			{
				// determine and set the real file path
				set[module.name] = path_parser(module, resolve_asset_path, options)
				return set
			},
			{})
	})

	// for debugging purposes
	// console.log(JSON.stringify(output, null, 2))

	// create all the folders in the path if they don't exist
	mkdirp.sync(path.dirname(options.output))

	// write webpack stats file
	fs.writeFileSync(options.output, JSON.stringify(output))
}