// outputs webpack stats to console if there are no errors or warnings

import colors from 'colors/safe'

function error(error)
{
	// BELLs when something goes wrong!
	console.log("\x07" + error)
}

function warning(warning)
{
	console.log(warning)
}

let first_run  = true
let was_faulty = false

export default function notify_stats(stats, json)
{
	// if there were any errors
	if (json.errors.length > 0)
	{
		was_faulty = true
		return json.errors.forEach(error)
	}

	// if there were any warnings
	if (json.warnings.length > 0)
	{
		json.warnings.forEach(warning)
	}

	// if it's ok

	if (was_faulty && !first_run)
	{
		// green colour
		console.log(colors.green('~ Webpack build status: OK ~'))

		was_faulty = false
	}

	if (first_run)
	{
		console.log(stats.toString
		({
			chunks: false,
			colors: true
		}))

		first_run = false
	}
}