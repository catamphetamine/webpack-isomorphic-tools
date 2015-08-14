import path   from 'path'
import fs     from 'fs'
import colors from 'colors/safe'

import hook      from './tools/node-hook'
import serialize from './tools/serialize-javascript'

import write_assets  from './plugins/write assets'
import notify_stats from './plugins/notify stats'

import { exists, clone } from './helpers'

// using ES6 template strings
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/template_strings
export default class webpack_isomorphic_tools
{
	constructor(options)
	{
		// take the passed in options
		this.options = clone(options)

		// a list of files which can be require()d normally on the server
		// (for example, if you have require("./file.json") both in webpack and in the server code)
		// (should work, not tested)
		this.options.exceptions = this.options.exceptions || []

		// just being polite
		if (!this.options.assets)
		{
			this.options.assets = []
			// throw new Error('You must specify "assets" parameter')
		}

		// used to keep track of cached assets and flush their caches on .refresh() call
		this.cached_assets = []

		// webpack-assets.json path, relative to the project base path
		this.options.webpack_assets_file_path = this.options.webpack_assets_file_path || 'webpack-assets.json'	

		this.debug('instantiated webpack-isomorphic-tools with options:')
		this.debug(this.options)
	}

	// sets development mode flag to whatever was passed (or true if nothing was passed)
	// (development mode allows asset hot reloading when used with webpack-dev-server)
	development(flag)
	{
		// set development mode flag
		this.options.development = exists(flag) ? flag : true

		if (this.options.development)
		{
			this.debug('entering development mode')
		}
		else
		{
			this.debug('entering production mode')
		}

		// allows method chaining
		return this
	}

	// adds module loaders and plugins to webpack configuration
	populate(webpack_configuration)
	{
		// is client-side
		// (currently unused variables)
		this.options.server = false

		// validate webpack configuration
		if (!webpack_configuration.context)
		{
			throw new Error('You must specify "configuration.context" in your webpack configuration')
		}

		// validate webpack configuration
		if (!webpack_configuration.output)
		{
			throw new Error('You must specify "configuration.output" section in your webpack configuration')
		}

		// // validate webpack configuration
		// if (!webpack_configuration.output.path)
		// {
		// 	throw new Error('You must specify "configuration.output.path" in your webpack configuration')
		// }
		
		// validate webpack configuration
		if (!webpack_configuration.output.publicPath)
		{
			throw new Error('You must specify "configuration.output.publicPath" in your webpack configuration')
		}

		// project base path, required to output webpack-assets.json
		this.options.project_path = webpack_configuration.context

		// this.options.webpack_output_path = webpack_configuration.output.path

		this.debug('populating webpack configuration')

		// ensure the "module.loaders" path exists inside webpack configuration
		webpack_configuration.module = webpack_configuration.module || {}
		webpack_configuration.module.loaders = webpack_configuration.module.loaders || {}

		// assets regular expressions (based on extensions).
		// will be used in loaders and in write_assets
		const regular_expressions = {}

		// for each user defined asset type
		for (let description of this.options.assets)
		{
			// for readability
			description.name = description.name || (description.extension || description.extensions.join(', '))

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

			regular_expressions[description.name] = new RegExp(`\\.${extension_matcher}$`)

			// if a "loader" (or "loaders") are specified, then create a webpack module loader
			if (description.loader || description.loaders)
			{
				const loader =
				{
					test : regular_expressions[description.name]
				}

				// specify the loader (or loaders)
				if (description.loader)
				{
					loader.loader = description.loader
				}
				else
				{
					loader.loaders = description.loaders
				}

				// restrict the loader to specific paths if needed
				if (description.path || description.paths)
				{
					loader.include = description.paths || [description.path]
				}

				this.debug('adding webpack loader:')
				// simple JSON.stringify won't suffice 
				// because loader's test property is a regular expression
				// (but serialize-javascript does no indentation)
				this.debug(serialize(loader))

				// add the loader to webpack configuration
				webpack_configuration.module.loaders.push(loader)
			}
		}

		// webpack-assets.json file path
		const webpack_assets_file_path = this.webpack_assets_path()

		// add webpack assets plugins

		// selfie
		const tools = this
		const options = this.options

		// write_assets writes webpack compiled files' names to a special .json file
		// (this will be used later to fetch these files from server)
		function write_assets_plugin()
		{
			this.plugin('done', function(stats)
			{
				write_assets.call(this, stats,
				{ 
					development         : options.development,
					debug               : options.debug,
					output_file         : webpack_assets_file_path,
					output              : () => tools.default_webpack_assets(),
					assets              : options.assets,
					regular_expressions : regular_expressions,
					log:
					{
						info    : tools.info.bind(tools),
						debug   : tools.debug.bind(tools),
						warning : tools.warning.bind(tools),
						error   : tools.error.bind(tools)
					}
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

				write_assets_plugin
			)
		}
		else
		{
			webpack_configuration.plugins = webpack_configuration.plugins.concat
			(
				write_assets_plugin
			)
		}

		// allows method chaining
		return this
	}

	// gets webpack-assets.json file path
	webpack_assets_path()
	{
		return path.resolve(this.options.project_path, this.options.webpack_assets_file_path)
	}

	// returns a mapping to read file paths for all the user specified asset types
	// along with a couple of predefined ones: javascripts and styles
	assets()
	{
		// webpack and node.js start in parallel
		// so webpack-assets.json might not exist on the very first run
		// (or there should be a better way of webpack notifying about build ending)
		if (!fs.existsSync(this.webpack_assets_path()))
		{
			this.error(`"${this.webpack_assets_path()}" not found. Using an empty stub instead`)
			return this.default_webpack_assets()
		}

		return require(this.webpack_assets_path())
	}

	// returns a stub for webpack-assets.json
	// (because it doesn't exist on the very first run)
	// https://github.com/halt-hammerzeit/webpack-isomorphic-tools#race-condition-looking-for-a-solution
	default_webpack_assets()
	{
		const webpack_assets = 
		{
			javascript: {},
			styles: {}
		}

		return webpack_assets
	}

	// clear the require.cache (only used in developer mode with webpack-dev-server)
	refresh()
	{
		// ensure this is development mode
		if (!this.options.development)
		{
			throw new Error('.refresh() called in production mode. Did you forget to call .development() method on your webpack-isomorphic-tools server instance?')
		}

		// sanity check
		if (!this.options.server)
		{
			throw new Error('.refresh() called not on a server')
		}

		this.debug('flushing require() caches')

		// uncache webpack-assets.json file
		// this.debug(' flushing require() cache for webpack assets json file')
		// this.debug(` (was cached: ${typeof(require.cache[this.webpack_assets_path()]) !== 'undefined'})`)
		delete require.cache[this.webpack_assets_path()]

		// uncache cached assets
		for (let path of this.cached_assets)
		{
			this.debug(` flushing require() cache for ${path}`)
			delete require.cache[path]
		}

		// no assets are cached now
		this.cached_assets = []
	}

	// Initializes server-side instance of `webpack-isomorphic-tools` 
	// with the base path for your project, then calls `.register()`,
	// and after that calls .ready(callback).
	//
	// The `project_path` parameter must be identical 
	// to the `context` parameter of your Webpack configuration 
	// and is needed to locate `webpack-assets.json` 
	//  which is output by Webpack process. 
	//
	// sets up "project_path" option
	// (this option is required on the server to locate webpack-assets.json)
	server(project_path, callback)
	{
		// is server-side
		// (currently unused variables)
		this.options.server = true

		// project base path, required to locate webpack-assets.json
		this.options.project_path = project_path

		// register require() hooks
		this.register()

		// call back when ready
		return this.ready(callback)
	}

	// Registers Node.js require() hooks for the assets
	//
	// This is what makes the `requre()` magic work on server. 
	// These `require()` hooks must be set before you `require()` 
	// any of your assets 
	// (e.g. before you `require()` any React components 
	// `require()`ing your assets).
	//
	// read this article if you don't know what a "require hook" is
	// http://bahmutov.calepin.co/hooking-into-node-loader-for-fun-and-profit.html
	register()
	{
		this.debug('registering require() hooks for assets')

		// sanity check
		if (!this.options.server)
		{
			throw new Error('.register() called not on a server')
		}

		// for each user specified asset type which isn't for .js files
		// (because '.js' files requiring already works natively)
		this.options.assets.filter(description =>
		{
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
		.forEach(description =>
		{
			(description.extensions || [description.extension]).forEach(extension =>
			{
				this.register_extension(extension)
			})
		})

		// allows method chaining
		return this
	}

	// is called when you require() your assets
	// (or can be used manually without require hooks)
	require(asset_path)
	{
		this.debug(`requiring ${asset_path}`)

		// sanity check
		if (!this.options.server)
		{
			throw new Error('.require() called not on a server')
		}

		// sanity check
		if (!asset_path)
		{
			return ''
		}

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
		this.error(`asset not found: ${asset_path}`)
		return ''
	}

	// registers a require hook for a particular file extension
	register_extension(extension)
	{
		this.debug(` registering a require() hook for *.${extension}`)

		// sanity check
		if (!this.options.server)
		{
			throw new Error('.register_extension() called not on a server')
		}

		// place the require() hook for this extension
		hook.hook(`.${extension}`, (asset_path, fallback) =>
		{
			this.debug(`require() hook fired for ${asset_path}`)

			// track cached assets (only in development mode)
			if (this.options.development)
			{
				// mark this asset as cached
				this.cached_assets.push(asset_path)
			}

			// convert absolute path to relative path
			asset_path = path.relative(this.options.project_path, asset_path)

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
				this.debug(`skipping require call for ${asset_path}`)
				return fallback()
			}

			// require() this asset (returns the real file path for this asset, e.g. an image)
			return this.require(asset_path)
		})
	}

	// Waits for webpack-assets.json to be created after Webpack build process finishes
	//
	// The callback is called when `webpack-assets.json` has been found 
	// (it's needed for development because `webpack-dev-server` 
	//  and your application server are usually run in parallel).
	//
	ready(done)
	{
		// sanity check
		if (!this.options.server)
		{
			throw new Error('.ready() called not on a server')
		}

		// condition check interval
		const interval = 1000 // in milliseconds

		// selfie
		const tools = this

		// waits for condition to be met, then proceeds
		function wait_for(condition, proceed)
		{
			function check()
			{
				// if the condition is met, then proceed
				if (condition())
				{
					return proceed()
				}

				tools.debug(`(${tools.webpack_assets_path()} not found)`)
				tools.info('(waiting for the first Webpack build to finish)')

				setTimeout(check, interval)
			}

			check()
		}

		// wait for webpack-assets.json to be written to disk by Webpack
		wait_for(() => fs.existsSync(this.webpack_assets_path()), done)

		// allows method chaining
		return this
	}

	// outputs info to the log
	info(message)
	{
		console.log(log_preamble, generate_log_message(message))
	}

	// outputs debugging info to the log
	debug(message)
	{
		if (this.options.debug)
		{
			console.log(log_preamble, '[debug]', generate_log_message(message))
		}
	}

	// outputs a warning to the log
	warning(message)
	{
		console.log(colors.yellow(log_preamble, '[warning]', generate_log_message(message)))
	}

	// outputs an error to the log
	error(message)
	{
		console.log(colors.red(log_preamble, '[error]', generate_log_message(message)))
	}
}

// a sample path parser for webpack url-loader
// (works for images, fonts, and i guess for everything else, should work for any file type)
webpack_isomorphic_tools.url_loader_parser = function(module, options)
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
		asset_path = options.assets_base_path + asset_path
	}

	return asset_path
}

// transforms arguments to text
function generate_log_message(message)
{
	if (typeof message === 'object')
	{
		return JSON.stringify(message, null, 2)
	}
	return message
}

// is prepended to console output
const log_preamble = '[webpack-isomorphic-tools]'