import fs     from 'fs'
import path   from 'path'
import mkdirp from 'mkdirp'

// writes webpack-stats.json file, which contains assets' file paths
export default function write_stats(stats, options)
{
	const _production_  = options.environment === 'production'
	const _development_ = options.environment === 'development'

	const output_path = this.options.output.publicPath

	const json = stats.toJson()

	const output = {}

	// output.json = json

	const resolve_asset_path = asset_path =>
	{
		// if (_development_)
		// {
		// 	// path.resolve doesn't work for Http protocol
			return this.options.output.publicPath + asset_path
		// }
		// else
		// {
		// 	return path.resolve(this.options.output.path, asset_path)
		// }
	}

	// // get assets by name and extensions
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
			.map(name => resolve_asset_path(name))
	}

	output.javascript = {}

	// output stats for all application javascript entry points
	Object.keys(this.options.entry).forEach(chunk_name =>
	{
		let entry = this.options.entry[chunk_name]
		if (Array.isArray(entry))
		{
			entry = entry[entry.length - 1]
		}

		output.javascript[entry] = get_assets(chunk_name, 'js')[0]
		// the second asset is usually a source map
	})
	
	output.styles = {}

	if (_production_)
	{
		// output stats for all application css entry points
		// (it's how extract-text-plugin works in production)
		Object.keys(this.options.entry).forEach(chunk_name =>
		{
			let entry = this.options.entry[chunk_name]
			if (Array.isArray(entry))
			{
				entry = entry[entry.length - 1]
			}

			output.styles[entry] = get_assets(chunk_name, 'css')[0]
			// the second asset is usually a source map
		})
	}

	// omit node_modules contents and internal webpack modules
	const modules = json.modules.filter(module =>
	{
		return module.name.indexOf('./~/') !== 0 && module.name.indexOf('(webpack)') !== 0
	})

	const default_filter = (asset, regular_expression) => regular_expression.test(asset.name)

	Object.keys(options.assets).forEach(asset_type =>
	{
		const asset_description = options.assets[asset_type]

		const filter = (asset_description.filter || default_filter).bind(this)
		const path_parser = asset_description.path_parser.bind(this)

		if (!asset_description.path_parser)
		{
			throw new Error(`path_parser required for asset type "${asset_type}"`)
		}

		output[asset_type] = modules
			.filter(module => filter(module, options.regular_expressions[asset_type], options))
			.reduce((set, module) =>
			{
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