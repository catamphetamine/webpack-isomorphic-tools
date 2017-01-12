import path from 'path'

import write_assets  from './write assets'
import notify_stats  from './notify stats'

import Log from './../tools/log'

import { exists, clone, convert_from_camel_case, alias_properties_with_camel_case } from './../helpers'

import { default_webpack_assets, normalize_options, verbosity_levels } from './../common'

// a Webpack plugin
export default function Webpack_isomorphic_tools_plugin(options)
{
	// take the passed in options
	this.options = convert_from_camel_case(clone(options))

	// add missing fields, etc
	normalize_options(this.options)

	// logging
	this.log = new Log('webpack-isomorphic-tools/plugin', { debug: this.options.debug })

	// assets regular expressions (based on extensions).
	// will be used in loaders and in write_assets
	this.regular_expressions = {}

	// for each user defined asset type
	for (let asset_type of Object.keys(this.options.assets))
	{
		const description = this.options.assets[asset_type]

		// create a regular expression for this file extension (or these file extensions)
		this.regular_expressions[asset_type] = description.regular_expression || Webpack_isomorphic_tools_plugin.regular_expression(description.extensions)
	}
}

// starts HTTP service in development mode
// https://github.com/halt-hammerzeit/webpack-isomorphic-tools/issues/92
Webpack_isomorphic_tools_plugin.prototype.start_dev_server = function()
{
	const express = require('express')
	const app = express()

	app.get('/', (request, response) =>
	{
		if (!this.assets)
		{
			return response.status(404).send('Webpack assets not generated yet')
		}

		response.send(this.assets)
	})

	app.listen(this.options.port, () =>
	{
		this.log.info(`HTTP service listening on port ${this.options.port}`)
	})
}

// creates a regular expression for this file extension (or these file extensions)
Webpack_isomorphic_tools_plugin.prototype.regular_expression = function(asset_type)
{
	if (!exists(this.regular_expressions[asset_type]))
	{
		throw new Error(`There's no asset type "${asset_type}" defined in webpack-isomorphic-tools configuration. Perhaps you didn't spell it correctly.`)
	}

	return this.regular_expressions[asset_type]
}

// shorthand alias
Webpack_isomorphic_tools_plugin.prototype.regexp = Webpack_isomorphic_tools_plugin.prototype.regular_expression

// creates a regular expression for this file extension (or these file extensions)
Webpack_isomorphic_tools_plugin.regular_expression = function(extensions)
{
	if (!Array.isArray(extensions))
	{
		throw new Error(`You were expected to pass a list of extensions (an array). Instead got: ${extensions}. Maybe you were looking for the instance method istead of the class method of this plugin?`)
	}

	let matcher
	if (extensions.length > 1)
	{
		matcher = `(${extensions.join('|')})`
	}
	else
	{
		matcher = extensions
	}

	return new RegExp(`\\.${matcher}$`)
}

// sets development mode flag to whatever was passed (or true if nothing was passed)
// (development mode allows asset hot reloading when used with webpack-dev-server)
Webpack_isomorphic_tools_plugin.prototype.development = function(flag)
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

// applies the plugin to the Webpack build
Webpack_isomorphic_tools_plugin.prototype.apply = function(compiler)
{
	// start HTTP service in development mode
	// https://github.com/halt-hammerzeit/webpack-isomorphic-tools/issues/92
	//
	// (`.apply()` is only called once, so can start the dev server here)
	//
	if (this.options.development && this.options.port)
	{
		this.start_dev_server()
	}

	// Webpack configuration
	const webpack_configuration = compiler.options

	// validate webpack configuration
	if (!webpack_configuration.context)
	{
		throw new Error('You must specify ".context" in your webpack configuration')
	}

	// project base path, required to output webpack-assets.json
	this.options.project_path = webpack_configuration.context

	// resolve webpack-assets.json file path
	const webpack_assets_path = path.resolve(this.options.project_path, this.options.webpack_assets_file_path)

	// resolve webpack-stats.json file path
	const webpack_stats_path = path.resolve(this.options.project_path, this.options.webpack_stats_file_path)

	// selfie
	const plugin = this

	// when all is done
	// https://github.com/webpack/docs/wiki/plugins
	compiler.plugin('done', function(stats)
	{
		plugin.log.debug('------------------- Started -------------------')

		const json = stats.toJson
		({
			context: webpack_configuration.context
		})

		// output some info to the console if in development mode
		if (plugin.options.development && plugin.options.verbosity !== verbosity_levels.no_webpack_stats)
		{
			// outputs stats info to the console
			// (only needed in development mode)
			notify_stats(stats, json, plugin.options.verbosity === verbosity_levels.webpack_stats_for_each_build)
		}

		// assets base path (on disk or on the network)
		//
		// (first search for the `devServer.publicPath` setting,
		//  then fallback to the generic `publicPath`)
		//
		// (using `publicPath` from webpack stats here
		//  as opposed to `webpack_configuration.output.publicPath`
		//  because it is processed by webpack replacing things like `[hash]`)
		//
		const assets_base_url = (webpack_configuration.devServer && webpack_configuration.devServer.publicPath) ? webpack_configuration.devServer.publicPath : json.publicPath

		// serve webpack assets from RAM rather than from disk
		const serve_assets_from_memory = plugin.options.development && plugin.options.port

		// write webpack-assets.json with assets info
		// and cache them in plugin instance
		// for later serving from HTTP service
		plugin.assets = write_assets(json,
		{
			development         : plugin.options.development,
			debug               : plugin.options.debug,
			assets              : plugin.options.assets,
			alias               : plugin.options.alias,
			project_path        : plugin.options.project_path,
			assets_base_url,
			webpack_assets_path : webpack_assets_path,
			webpack_stats_path  : webpack_stats_path,
			output              : default_webpack_assets(),
			output_to_a_file    : !serve_assets_from_memory,
			regular_expressions : plugin.regular_expressions
		},
		plugin.log)

		plugin.log.debug('------------------- Finished -------------------')
	})
}

// a sample module source parser for webpack url-loader
// (works for images, fonts, and i guess for everything else, should work for any file type)
Webpack_isomorphic_tools_plugin.url_loader_parser = function(module, options, log)
{
	return module.source
}

// a sample module source parser for webpack css-loader
// (without css-loader "modules" feature support)
Webpack_isomorphic_tools_plugin.css_loader_parser = function(module, options, log)
{
	return module.source + '\n module.exports = module.exports.toString();'
}

// a sample module source parser for webpack css-loader
// (with css-loader "modules" feature support)
Webpack_isomorphic_tools_plugin.css_modules_loader_parser = function(module, options, log)
{
	return module.source + '\n module.exports = exports.locals || {}; module.exports._style = exports.toString();'
}

// a filter for getting a css module when using it with style-loader
//
// in development mode there's webpack "style-loader",
// so the module with module.name equal to the asset path is not what's needed
// (because what that module does is it creates a <style/> tag on the page).
// the module with the CSS styles is the one with a long name:
Webpack_isomorphic_tools_plugin.style_loader_filter = function(module, regular_expression, options, log)
{
	const css_loader = module.name.split('!')[0]
	return regular_expression.test(module.name) &&
		// The paths below have the form of "/~/css-loader"
		// and not the form of "./~/css-loader"
		// because in some (non-standard) cases
		// Webpack project context can be set
		// not to project root folder.
		//
		// For a discussion see:
		// https://github.com/halt-hammerzeit/webpack-isomorphic-tools/pull/68
		// (there the `context` is set to the "${project_root}/src" folder
		//  so that the asset paths in `webpack-assets.json` wouldn't
		//  contain the "./src" prefix and therefore they will be found
		//  when require()d from code in "./target"
		//  which is compiled with Babel from the "./src" folder)
		//
		// I personally don't compile sources on the server side,
		// so I haven't thought of better ways of doing all that.
		//
		(css_loader.indexOf('/~/css-loader') > 0 ||
		 css_loader.indexOf('/~/.npminstall/css-loader') > 0 ||
		 css_loader.indexOf('/~/.store/css-loader') > 0)
}

// extracts css style file path
Webpack_isomorphic_tools_plugin.style_loader_path_extractor = function(module, options, log)
{
	return module.name.slice(module.name.lastIndexOf('!') + 1)
}

// Doesn't work with Babel 6 compiler
// // alias camel case for those who prefer it
// alias_properties_with_camel_case(Webpack_isomorphic_tools_plugin.prototype)
// alias_properties_with_camel_case(Webpack_isomorphic_tools_plugin)

// camelCase aliases

Webpack_isomorphic_tools_plugin.prototype.regularExpression = Webpack_isomorphic_tools_plugin.prototype.regular_expression

Webpack_isomorphic_tools_plugin.urlLoaderParser          = Webpack_isomorphic_tools_plugin.url_loader_parser
Webpack_isomorphic_tools_plugin.cssLoaderParser          = Webpack_isomorphic_tools_plugin.css_loader_parser
Webpack_isomorphic_tools_plugin.cssModulesLoaderParser   = Webpack_isomorphic_tools_plugin.css_modules_loader_parser
Webpack_isomorphic_tools_plugin.styleLoaderFilter        = Webpack_isomorphic_tools_plugin.style_loader_filter
Webpack_isomorphic_tools_plugin.styleLoaderPathExtractor = Webpack_isomorphic_tools_plugin.style_loader_path_extractor
