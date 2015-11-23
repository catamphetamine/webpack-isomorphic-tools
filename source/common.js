import path from 'path'
import fs from 'fs'

import require_hacker from 'require-hacker'

import { is_object, is_function, exists, starts_with } from './helpers'

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
	// parameters check
	for (let key of Object.keys(options))
	{
		switch (key)
		{
			case 'assets':
				if (!is_object(options[key]))
				{
					throw new Error(`"${key}" configuration parameter must be ` + `an object`)
				}
				break

			case 'debug':
				if (typeof options[key] !== 'boolean')
				{
					throw new Error(`"${key}" configuration parameter must be ` + `a boolean`)
				}
				break

			case 'webpack_assets_file_path':
			case 'webpack_stats_file_path':
				if (typeof options[key] !== 'string')
				{
					throw new Error(`"${key}" configuration parameter must be ` + `a string`)
				}
				break

			case 'alias':
				if (!is_object(options[key]))
				{
					throw new Error(`"${key}" configuration parameter must be ` + `an object`)
				}
				break

      case 'asset_transformer':
        if (!is_function(options[key]))
        {
          throw new Error(`"${key}" configuration parameter must be ` + `a function`)
        }
        break

			default:
				throw new Error(`Unknown configuration parameter "${key}"`)
		}
	}

	// if no assets specified (for whatever reason), make it an empty array
	if (!options.assets)
	{
		// options.assets = {}
		throw new Error('You must specify "assets" parameter in webpack-isomorphic-tools configuration')
	}

	// webpack-assets.json path, relative to the project base path
	options.webpack_assets_file_path = options.webpack_assets_file_path || 'webpack-assets.json'	

	// webpack-stats.json path, relative to the project base path
	options.webpack_stats_file_path = options.webpack_stats_file_path || 'webpack-stats.json'	

	// if Webpack aliases are supplied, validate them
	if (options.alias)
	{
		for (let key of Object.keys(options.alias))
		{
			if (typeof options.alias[key] !== 'string')
			{
				throw new Error(`Invalid alias for "${key}": "${options.alias[key]}"`)
			}
		}
	}

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

			// sanity check
			if (typeof description.extension !== 'string')
			{
				throw new Error(`"extension" value must be a string for assets of type "${asset_type}"`)
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

		// parameters check
		for (let key of Object.keys(description))
		{
			switch (key)
			{
				case 'extensions':
					break

				case 'exclude':
				case 'include':
					if (!Array.isArray(description[key]))
					{
						throw new Error(`"${key}" must be an array for asset type "${asset_type}"`)
					}
					for (let clusion of description[key])
					{
						if (typeof clusion !== 'string' 
							&& !(clusion instanceof RegExp)
							&& typeof clusion !== 'function')
						{
							throw new Error(`Unsupported object type for exclusion/inclusion "${clusion}" for asset type "${asset_type}"`)
						}
					}
					break

				case 'filter':
				case 'parser':
				case 'path':
					if (typeof description[key] !== 'function')
					{
						throw new Error(`"${key}" must be a function for asset type "${asset_type}"`)
					}
					break

				default:
					throw new Error(`Unknown property "${key}" for asset type "${asset_type}"`)
			}
		}
	}
}

// alias the path and require() the correct file if an alias is found
export function alias_hook(path, module, project_path, aliases, log)
{
	// possibly alias the path
	const aliased_path = alias(path, aliases)

	// return if an alias not found
	if (!aliased_path)
	{
		return
	}

	// if an alias is found, require() the correct path
	log.debug(`alias found for "${path}", resolving to path "${aliased_path}"`)

	// resolve the path to a real filesystem path (resolves `npm link`, etc)
	const global_path = require_hacker.resolve(aliased_path, module)
	log.debug(` global path for the aliased module is ${global_path}`)

	const result = require(global_path)
	// log.debug(` the path was found`)

	return require_hacker.to_javascript_module_source(result)
}

// alias the path provided the aliases map
function alias(path, aliases)
{
	// if it's a path to a file - don't interfere
	if (starts_with(path, '.') || starts_with(path, '/'))
	{
		return
	}

	// extract module name from the path
	const slash_index = path.indexOf('/')
	const module_name = slash_index >= 0 ? path.substring(0, slash_index) : path
	const rest = slash_index >= 0 ? path.substring(slash_index) : ''

	// find an alias
	const alias = aliases[module_name]

	// if an alias is found, require() the correct path
	if (alias)
	{
		return alias + rest
	}
}

// converts global asset path to local-to-the-project asset path
export function normalize_asset_path(global_asset_path, project_path)
{
	// // if this path is outside project folder,
	// // return it as a global path
	// if (!starts_with(global_asset_path, project_path + path.sep))
	// {
	// 	return global_asset_path
	// }

	// this path is inside project folder,
	// convert it to a relative path

	// asset path relative to the project folder
	let asset_path = path.relative(project_path, global_asset_path)

	// for Windows:
	//
	// convert Node.js path to a correct Webpack path
	asset_path = asset_path.replace(/\\/g, '/')
	// add './' in the beginning if it's missing (for example, in case of Windows)
	if (asset_path.indexOf('.') !== 0)
	{
		asset_path = './' + asset_path
	}

	return asset_path
}

// replaces inner node_modules with ~
export function webpack_path(asset_path)
{
	// webpack has a shortcut from "node_modules"
	if (starts_with(asset_path, './node_modules/'))
	{
		asset_path = asset_path.replace('./node_modules/', './~/')
	}

	return asset_path
}