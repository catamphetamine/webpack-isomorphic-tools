import path from 'path'

import { is_object, exists, starts_with } from './helpers'

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
					if (!Array.isArray(description[key]))
					{
						throw new Error(`"${key}" must be an array for asset type "${asset_type}"`)
					}
					for (let exclusion of description[key])
					{
						if (typeof exclusion !== 'string' 
							&& !(exclusion instanceof RegExp)
							&& typeof exclusion !== 'function')
						{
							throw new Error(`Unsupported object type for exclusion "${exclusion}" for asset type "${asset_type}"`)
						}
					}
					break

				case 'include':
					if (!Array.isArray(description[key]))
					{
						throw new Error(`"${key}" must be an array for asset type "${asset_type}"`)
					}
					for (let inclusion of description[key])
					{
						if (typeof inclusion !== 'string' 
							&& !(inclusion instanceof RegExp)
							&& typeof inclusion !== 'function')
						{
							throw new Error(`Unsupported object type for inclusion "${inclusion}" for asset type "${asset_type}"`)
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

export function alias(path, aliases)
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