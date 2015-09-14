import path from 'path'

import write_assets  from './write assets'
import notify_stats  from './notify stats'

import Log from './../tools/log'

import { exists, clone, alias_camel_case } from './../helpers'

import { default_webpack_assets, normalize_options } from './../common'

// a Webpack plugin
export default function Plugin(options)
{
	// take the passed in options
	this.options = alias_camel_case(clone(options))

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
	return this.regular_expressions[asset_type]
}

// creates a regular expression for this file extension (or these file extensions)
Plugin.regular_expression = function(extensions)
{
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
	// selfie
	const plugin = this

	// Webpack configuration
	const webpack_configuration = compiler.options

	// validate webpack configuration
	if (!webpack_configuration.context)
	{
		throw new Error('You must specify ".context" in your webpack configuration')
	}

	// project base path, required to output webpack-assets.json
	plugin.options.project_path = webpack_configuration.context

	// resolve webpack-assets.json file path
	const webpack_assets_path = path.resolve(plugin.options.project_path, plugin.options.webpack_assets_file_path)

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

	// assets base path (on disk or on the network)
	const assets_base_path = webpack_configuration.output.publicPath

	// when all is done
	// https://github.com/webpack/docs/wiki/plugins
	compiler.plugin('done', function(stats)
	{
		var json = stats.toJson()

		// output some info to the console if in developmetn mode
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
			assets_base_path    : assets_base_path,
			webpack_assets_path : webpack_assets_path,
			output              : default_webpack_assets(),
			regular_expressions : plugin.regular_expressions
		},
		plugin.log)
	})
}

// a sample path parser for webpack url-loader
// (works for images, fonts, and i guess for everything else, should work for any file type)
Plugin.url_loader_parser = function(module, options)
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

// alias camel case for those who prefer it
Plugin.urlLoaderParser = Plugin.url_loader_parser