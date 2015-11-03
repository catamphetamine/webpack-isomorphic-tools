import path from 'path'

import serialize from './tools/serialize-javascript'

import { exists } from './helpers'

// returns a stub for webpack-assets.json if it doesn't exist yet
// (because node.js and webpack are being run in parallel in development mode)
export function default_webpack_assets()
{
	const webpack_assets = 
	{
		javascript: {},
		styles: {},
		assets: {}
	}

	return webpack_assets
}

// adds missing fields, etc
export function normalize_options(options)
{
	// if no assets specified (for whatever reason), make it an empty array
	if (!options.assets)
	{
		options.assets = {}
		// throw new Error('You must specify "assets" parameter')
	}

	// webpack-assets.json path, relative to the project base path
	options.webpack_assets_file_path = options.webpack_assets_file_path || 'webpack-assets.json'	

	// generate names (if required) for each user defined asset type, normalize extensions
	for (let asset_type of Object.keys(options.assets))
	{
		const description = options.assets[asset_type]

		// normalize extensions
		if (description.extension)
		{
			// sanity check
			if (Array.isArray(description.extension))
			{
				throw new Error(`Use "extensions" key instead of "extension" for specifying an array of file extensions for assets of type "${asset_type}"`)
			}

			// normalize
			description.extensions = [description.extension]
			delete description.extension
		}

		// sanity check
		if (!description.extensions)
		{
			throw new Error(`You must specify file extensions for assets of type "${asset_type}"`)
		}
	}
}

// returns a CommonJS modules source.
export function to_javascript_module_source(source)
{
	// if the asset source wasn't found - return an empty CommonJS module
	if (!exists(source))
	{
		return 'module.exports = undefined'
	}

	// if it's already a common js module source
	if (typeof source === 'string' && is_a_module_declaration(source))
	{
		return source
	}

	// generate javascript module source code based on the `source` variable
	return 'module.exports = ' + serialize(source)
}

// detect if it is a CommonJS module declaration
function is_a_module_declaration(source)
{
	return source.indexOf('module.exports = ') === 0 ||
		/\s+module\.exports = .+/.test(source)
}