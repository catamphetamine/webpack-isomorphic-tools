import path from 'path'

// returns a stub for webpack-assets.json if it doesn't exist yet
// (because node.js and webpack are being run in parallel in development mode)
export function default_webpack_assets()
{
	const webpack_assets = 
	{
		javascript: {},
		styles: {}
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
			description.extensions = [description.extension]
		}

		// // set asset type name (if required), for readability
		// description.name = description.name || description.extensions.join(', ')
	}
}