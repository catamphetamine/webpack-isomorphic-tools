import path   from 'path'
import fs     from 'fs'

import hook      from './tools/node-hook'
import serialize from './tools/serialize-javascript'
import Log       from './tools/log'

import { exists, clone, alias_camel_case } from './helpers'
import { default_webpack_assets, normalize_options } from './common'

// using ES6 template strings
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/template_strings
export default class webpack_isomorphic_tools
{
	constructor(options)
	{
		// take the passed in options
		this.options = alias_camel_case(clone(options))

		// a list of files which can be require()d normally on the server
		// (for example, if you have require("./file.json") both in webpack and in the server code)
		// (should work, not tested)
		this.options.exceptions = this.options.exceptions || []

		// used to keep track of cached assets and flush their caches on .refresh() call
		this.cached_assets = []

		// add missing fields, etc
		normalize_options(this.options)

		// logging
		this.log = new Log('webpack-isomorphic-tools', { debug: this.options.debug })

		this.log.debug('instantiated webpack-isomorphic-tools with options', this.options)
	}

	// sets development mode flag to whatever was passed (or true if nothing was passed)
	// (development mode allows asset hot reloading when used with webpack-dev-server)
	development(flag)
	{
		// set development mode flag
		this.options.development = exists(flag) ? flag : true

		if (this.options.development)
		{
			this.log.debug('entering development mode')
		}
		else
		{
			this.log.debug('entering production mode')
		}

		// allows method chaining
		return this
	}

	// returns a mapping to read file paths for all the user specified asset types
	// along with a couple of predefined ones: javascripts and styles
	assets()
	{
		// webpack and node.js start in parallel
		// so webpack-assets.json might not exist on the very first run
		// (or there should be a better way of webpack notifying about build ending)
		if (!fs.existsSync(this.webpack_assets_path))
		{
			this.log.error(`"${this.webpack_assets_path}" not found. Using an empty stub instead`)
			return default_webpack_assets()
		}

		return require(this.webpack_assets_path)
	}

	// clear the require.cache (only used in developer mode with webpack-dev-server)
	refresh()
	{
		// ensure this is development mode
		if (!this.options.development)
		{
			throw new Error('.refresh() called in production mode. Did you forget to call .development() method on your webpack-isomorphic-tools server instance?')
		}

		this.log.debug('flushing require() caches')

		// uncache webpack-assets.json file
		// this.log.debug(' flushing require() cache for webpack assets json file')
		// this.log.debug(` (was cached: ${typeof(require.cache[this.webpack_assets_path]) !== 'undefined'})`)
		delete require.cache[this.webpack_assets_path]

		// uncache cached assets
		for (let path of this.cached_assets)
		{
			this.log.debug(` flushing require() cache for ${path}`)
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
		// project base path, required to locate webpack-assets.json
		this.options.project_path = project_path

		// resolve webpack-assets.json file path
		this.webpack_assets_path = path.resolve(this.options.project_path, this.options.webpack_assets_file_path)

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
		this.log.debug('registering require() hooks for assets')

		// for each user specified asset type which isn't for .js files
		// (because '.js' files requiring already works natively)
		Object.keys(this.options.assets).filter(asset_type =>
		{
			const description = this.options.assets[asset_type]

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
		.forEach(asset_type =>
		{
			const description = this.options.assets[asset_type]
			
			for (let extension of description.extensions)
			{
				this.register_extension(extension)
			}
		})

		// allows method chaining
		return this
	}

	// is called when you require() your assets
	// (or can be used manually without require hooks)
	require(asset_path)
	{
		this.log.debug(`requiring ${asset_path}`)

		// sanity check
		if (!asset_path)
		{
			// return ''
			return undefined
		}

		// get real file path list
		var assets = this.assets()
		
		// find this asset in the real file path list
		for (let type of Object.keys(assets))
		{
			const asset = assets[type][asset_path]
			// if the real path was found in the list - return it
			if (exists(asset))
			{
				return asset
			}
		}

		// serve a not-found asset maybe
		this.log.error(`asset not found: ${asset_path}`)
		// return ''
		return undefined
	}

	// registers a require hook for a particular file extension
	register_extension(extension)
	{
		this.log.debug(` registering a require() hook for *.${extension}`)

		// place the require() hook for this extension
		hook.hook(`.${extension}`, (asset_path, fallback) =>
		{
			this.log.debug(`require() hook fired for ${asset_path}`)

			// for caching
			const global_asset_path = asset_path

			// sanity check
			if (!this.options.project_path)
			{
				throw new Error(`You forgot to call the .server() method passing it your project's base path`)
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
				this.log.debug(`skipping require call for ${asset_path}`)
				return fallback()
			}

			// track cached assets (only in development mode)
			if (this.options.development)
			{
				// mark this asset as cached
				this.cached_assets.push(global_asset_path)
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

				tools.log.debug(`(${tools.webpack_assets_path} not found)`)
				tools.log.info('(waiting for the first Webpack build to finish)')

				setTimeout(check, interval)
			}

			check()
		}

		// wait for webpack-assets.json to be written to disk by Webpack
		wait_for(() => fs.existsSync(this.webpack_assets_path), done)

		// allows method chaining
		return this
	}
}