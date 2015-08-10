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

		// for each user defined asset type
		for (let assets_type of Object.keys(this.options.assets))
		{
			const description = options.assets[assets_type]

			// create a regular expression for this file type (or these file types)

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

			// if a "loader" (or "loaders") are specified, then create a webpack module loader
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

		// webpack-stats.json file path
		const webpack_stats_file_path = this.webpack_stats_path()

		// add webpack stats plugins

		// write_stats writes webpack compiled files' names to a special .json file
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
				// (only needed in development mode)
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

	// gets webpack-stats.json file path
	webpack_stats_path()
	{
		return path.resolve(this.webpack_configuration.output.path, '..', 'webpack-stats.json')
	}

	// returns a mapping to read file paths for all the user specified asset types
	// along with a couple of predefined ones: javascripts and styles
	assets()
	{
		// webpack and node.js start in parallel
		// so webpack-stats.json might not exist on the very first run
		// (or there should be a better way of webpack notifying about build ending)
		if (!fs.existsSync(this.webpack_stats_path()))
		{
			console.log(colors.red(`***** File "${this.webpack_stats_path()}" not found. Using an empty stub instead. This is normal because webpack-dev-server and Node.js both start simultaneously and therefore webpack hasn't yet finished its build process when Node.js server starts. Just restart your script after Webpack finishes the build (when green letter will appear in the console)`))
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

	// clear the require.cache (only used in developer mode with webpack-dev-server)
	refresh()
	{
		delete require.cache[require.resolve(this.webpack_stats_path())]
		return require(this.webpack_stats_path())
	}

	// registers a Node.js require hook
	//
	// read this article if you don't know what a "require hook" is
	// http://bahmutov.calepin.co/hooking-into-node-loader-for-fun-and-profit.html
	register()
	{
		// for each user specified asset type which isn't for .js files
		// (because '.js' files requiring already works natively)
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
		// register a require hook for each file extension of this asset type
		.forEach(assets_type =>
		{
			const description = this.options.assets[assets_type];
			(description.extensions || [description.extension]).forEach(extension =>
			{
				this.register_extension(extension)
			})
		})
	}

	// is called when you require() your assets
	// (or can be used manually without require hooks)
	require(asset_path)
	{
		if (!asset_path)
		{
			return ''
		}

		// console.log('* Requiring', asset_path)

		// get real file path list
		var assets = this.assets()
		
		// find this asset in the real file path list
		for (let type of Object.keys(assets))
		{
			const asset = assets[type][asset_path]
			// if the real path was found in the list - return it
			if (asset)
			{
				return asset
			}
		}

		// serve a not-found asset maybe
		console.log(colors.red(`***** Warning. Asset not found: ${asset_path}`))
		return ''
	}

	// registers a require hook for a particular file extension
	register_extension(extension)
	{
		hook.hook(`.${extension}`, (asset_path, fallback) =>
		{
			// convert absolute path to relative path
			asset_path = path.relative(this.webpack_configuration.context, asset_path)

			// convert Windows path to a correct Webpack path
			asset_path = asset_path.replace(/\\/g, '/')
			// add './' in the beginning if it's missing (is the case on Windows for example)
			if (asset_path.indexOf('.') !== 0)
			{
				asset_path = './' + asset_path
			}

			// if this filename is in the user specified exceptions list
			// then fallback to the normal require() behaviour
			if (this.options.exceptions.indexOf(asset_path) >= 0)
			{
				return fallback()
			}

			// require() this asset (returns the real file path for this asset, e.g. an image)
			return this.require(asset_path)
		})
	}
}

// a sample path parser of webpack url-loader
// (works for images, fonts, and i guess for everything else, should work for any file type)
webpack_isomorphic_tools.url_loader_path_parser = function(module, resolve_asset_path, options)
{
	// retain everything inside of double quotes.
	// usually it's "data:image..." for embedded with the double quotes
	// or __webpack_public_path__ + "..." for filesystem path
	const double_qoute_index = module.source.indexOf('"')
	let asset_path = module.source.slice(double_qoute_index + 1, -1)

	// check if the file was embedded (small enough)
	const is_embedded = asset_path.lastIndexOf('data:image', 0) === 0
	if (!is_embedded)
	{
		// if it wasn't embedded then it's a file path so resolve it
		asset_path = resolve_asset_path(asset_path)
	}

	return asset_path
}