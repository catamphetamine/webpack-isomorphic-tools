import path   from 'path'
import fs     from 'fs'
import colors from 'colors/safe'

import hook from './node-hook'

import write_stats  from './plugins/write stats'
import notify_stats from './plugins/notify stats'

// using ES6 template strings
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/template_strings
export default class webpack_isomorphic_tools
{
	constructor(webpack_configuration, options)
	{
		this.webpack_configuration = webpack_configuration
		this.options = options || {}

		// a list of files which can be require()d normally on the server
		// (for example, if you have require("./file.json") both in webpack and in the server code)
		// (should work, not tested)
		options.exceptions = options.exceptions || []

		if (!options.assets)
		{
			throw new Error('You must specify "assets" parameter')
		}

		const regular_expressions = {}

		// will be used with write_stats plugin
		// const assets = {}

		for (let assets_type of Object.keys(this.options.assets))
		{
			const description = options.assets[assets_type]

			let extension_matcher
			if (description.extensions && description.extensions.length > 1)
			{
				extension_matcher = `(${description.extensions.join('|')})`
			}
			else
			{
				extension_matcher = description.extension || description.extensions[0]
			}

			regular_expressions[assets_type] = new RegExp(`\\.${extension_matcher}$`)

			if (description.loader || description.loaders)
			{
				const loader =
				{
					test : regular_expressions[assets_type]
				}

				if (description.loader)
				{
					loader.loader = description.loader
				}
				else
				{
					loader.loaders = description.loaders
				}

				if (description.path || description.paths)
				{
					loader.include = description.paths || [description.path]
				}

				webpack_configuration.module.loaders.push(loader)
			}

			// assets[assets_type] = 
			// {
			// 	regular_expression : regular_expressions[assets_type]
			// }
		}

		if (!webpack_configuration.context)
		{
			throw new Error('You must specify "configuration.context" in your webpack configuration')
		}

		if (!webpack_configuration.output)
		{
			throw new Error('You must specify "configuration.output" section in your webpack configuration')
		}

		if (!webpack_configuration.output.path)
		{
			throw new Error('You must specify "configuration.output.path" in your webpack configuration')
		}
		
		if (!webpack_configuration.output.publicPath)
		{
			throw new Error('You must specify "configuration.output.publicPath" in your webpack configuration')
		}

		const webpack_stats_file_path = this.webpack_stats_path()

		// add webpack plugins

		// write webpack compiled files' names to a special .json file
		// (this will be used later to fetch these files from server)
		function write_stats_plugin()
		{
			this.plugin('done', function(stats)
			{
				write_stats.call(this, stats,
				{ 
					environment         : options.development ? 'development' : 'production',
					output              : webpack_stats_file_path,
					assets              : options.assets,
					regular_expressions : regular_expressions
				})
			})
		}

		webpack_configuration.plugins = webpack_configuration.plugins || []

		if (options.development)
		{
			webpack_configuration.plugins = webpack_configuration.plugins.concat
			(
				// outputs stats info to the console
				function()
				{
					this.plugin('done', notify_stats)
				},

				write_stats_plugin
			)
		}
		else
		{
			webpack_configuration.plugins = webpack_configuration.plugins.concat
			(
				write_stats_plugin
			)
		}
	}

	webpack_stats_path()
	{
		return path.resolve(this.webpack_configuration.output.path, '..', 'webpack-stats.json')
	}

	assets()
	{
		// webpack and node.js start in parallel, so web
		if (!fs.existsSync(this.webpack_stats_path()))
		{
			console.log(colors.red(`***** File "${this.webpack_stats_path()}" not found. Using an empty stub instead until the next try. This is normal because webpack-dev-server and Node.js both start simultaneously and therefore webpack hasn't yet finished its build process when Node.js server starts. Just restart your script after Webpack finishes the build (when green letter will appear in the console)`))
			return {}
		}

		const assets = require(this.webpack_stats_path())

		// // invalidate caches with empty data
		// // a better way would be to keep track of all the required modules in require()
		// for (let assets_type of Object.keys(assets))
		// {
		// 	const assets_of_type = assets[assets_type]
		// 	for (let path of Object.keys(assets_of_type))
		// 	{
		// 		const real_path = assets_of_type[path]				
		// 		// http://...
		// 		delete require.cache[require.resolve(real_path)]
		// 	}
		// }

		return assets
	}

	refresh()
	{
		delete require.cache[require.resolve(this.webpack_stats_path())]
		return require(this.webpack_stats_path())
	}

	register()
	{
		Object.keys(this.options.assets).filter(assets_type =>
		{
			const description = this.options.assets[assets_type]
			if (description.extension)
			{
				return description.extension !== 'js'
			}
			else
			{
				return description.extensions.indexOf('js') < 0
			}
		})
		.forEach(assets_type =>
		{
			const description = this.options.assets[assets_type];
			(description.extensions || [description.extension]).forEach(extension =>
			{
				this.register_extension(extension)
			})
		})
	}

	require(asset_path)
	{
		if (!asset_path)
		{
			return ''
		}

		// console.log('* Requiring', asset_path)

		var assets = this.assets()
		
		for (let type of Object.keys(assets))
		{
			const asset = assets[type][asset_path]
			if (asset)
			{
				return asset
			}
		}

		// Serve a not-found asset maybe
		console.log(colors.red(`***** Warning. Asset not found: ${asset_path}`))
		return ''
	}

	register_extension(extension)
	{
		hook.hook(`.${extension}`, (asset_path, fallback) =>
		{
			// convert absolute path to relative path
			asset_path = path.relative(this.webpack_configuration.context, asset_path)

			// convert Windows path to Webpack path
			asset_path = asset_path.replace(/\\/g, '/')
			if (asset_path.indexOf('.') !== 0)
			{
				asset_path = './' + asset_path
			}

			if (this.options.exceptions.indexOf(asset_path) >= 0)
			{
				return fallback()
			}

			return this.require(asset_path)
		})
	}
}

webpack_isomorphic_tools.url_loader_path_parser = function(module, resolve_asset_path, options)
{
	// retain everything inside of double quotes (don't know what it is for)
	const double_qoute_index = module.source.indexOf('"')
	let asset_path = module.source.slice(double_qoute_index + 1, -1)

	const is_embedded = asset_path.lastIndexOf('data:image', 0) === 0
	if (!is_embedded)
	{
		asset_path = resolve_asset_path(asset_path)
	}

	return asset_path
}