import path from 'path'

import write_assets  from './write assets'
import notify_stats  from './notify stats'

import Log from './../tools/log'

import { exists, clone, convert_from_camel_case } from './../helpers'

import { default_webpack_assets, normalize_options } from './../common'

// a Webpack plugin
export default function Plugin(options)
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

	// alias camel case for those who prefer it
	this.regularExpressions = this.regular_expressions

	// for each user defined asset type
	for (let asset_type of Object.keys(this.options.assets))
	{
		const description = this.options.assets[asset_type]

		// create a regular expression for this file extension (or these file extensions)
		this.regular_expressions[asset_type] = Plugin.regular_expression(description.extensions)
	}
}

// creates a regular expression for this file extension (or these file extensions)
Plugin.prototype.regular_expression = function(asset_type)
{
	if (!exists(this.regular_expressions[asset_type]))
	{
		throw new Error(`There's no asset type "${asset_type}" defined in webpack-isomorphic-tools configuration. Perhaps you didn't spell it correctly.`)
	}

	return this.regular_expressions[asset_type]
}

// creates a regular expression for this file extension (or these file extensions)
Plugin.regular_expression = function(extensions)
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
Plugin.prototype.development = function(flag)
{
	// set development mode flag
	this.options.development = exists(flag) ? flag : true

	/* istanbul ignore else */
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
Plugin.prototype.apply = function(compiler)
{
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

	// validate webpack configuration
	if (!webpack_configuration.output)
	{
		throw new Error('You must specify ".output" section in your webpack configuration')
	}
	
	// validate webpack configuration
	if (!webpack_configuration.output.publicPath)
	{
		throw new Error('You must specify ".output.publicPath" in your webpack configuration')
	}

	// // assets base path (on disk or on the network)
	// const assets_base_path = webpack_configuration.output.publicPath

	// selfie
	const plugin = this

	// when all is done
	// https://github.com/webpack/docs/wiki/plugins
	compiler.plugin('done', function(stats)
	{
		plugin.log.debug('------------------- Started -------------------')

		var json = stats.toJson()

		// output some info to the console if in development mode
		if (plugin.options.development)
		{
			// outputs stats info to the console
			// (only needed in development mode)
			notify_stats(stats, json)
		}

		// write webpack-assets.json with assets info
		write_assets(json,
		{ 
			development         : plugin.options.development,
			debug               : plugin.options.debug,
			assets              : plugin.options.assets,
			alias               : plugin.options.alias,
			project_path        : plugin.options.project_path,
			assets_base_url     : webpack_configuration.output.publicPath,
			webpack_assets_path : webpack_assets_path,
			webpack_stats_path  : webpack_stats_path,
			output              : default_webpack_assets(),
			regular_expressions : plugin.regular_expressions
		},
		plugin.log)

		plugin.log.debug('------------------- Finished -------------------')
	})
}

// a sample module source parser for webpack url-loader
// (works for images, fonts, and i guess for everything else, should work for any file type)
Plugin.url_loader_parser = function(module, options, log)
{
	return module.source
}

// a sample module source parser for webpack css-loader
// (without css-loader "modules" feature support)
Plugin.css_loader_parser = function(module, options, log)
{
	return module.source + '\n module.exports = module.exports.toString();'
}

// a sample module source parser for webpack css-loader
// (with css-loader "modules" feature support)
Plugin.css_modules_loader_parser = function(module, options, log)
{
	return module.source + '\n module.exports = exports.locals || {}; module.exports._style = exports.toString();'
}

// a filter for getting a css module when using it with style-loader
//
// in development mode there's webpack "style-loader",
// so the module with module.name equal to the asset path is not what's needed
// (because what that module does is it creates a <style/> tag on the page).
// the module with the CSS styles is the one with a long name:
Plugin.style_loader_filter = function(module, regular_expression, options, log)
{
	return regular_expression.test(module.name) && module.name.indexOf('./~/css-loader') === 0
}

// extracts css style file path
Plugin.style_loader_path_extractor = function(module, options, log)
{
	return module.name.slice(module.name.lastIndexOf('!') + 1)
}

// alias camel case for those who prefer it
Plugin.urlLoaderParser        = Plugin.url_loader_parser
Plugin.cssLoaderParser        = Plugin.css_loader_parser
Plugin.cssModulesLoaderParser = Plugin.css_modules_loader_parser