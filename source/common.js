import path from 'path'

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

export function webpack_stats_file_path(webpack_assets_file_path)
{
	// default webpack stats file name
	let webpack_stats_file_name = 'webpack-stats.json'

	// resolve a possible file name collision
	if (path.basename(webpack_assets_file_path) === webpack_stats_file_name)
	{
		webpack_stats_file_name = 'webpack-stats.debug.json'
	}

	// path to webpack stats file
	return path.resolve(path.dirname(webpack_assets_file_path), webpack_stats_file_name)
}