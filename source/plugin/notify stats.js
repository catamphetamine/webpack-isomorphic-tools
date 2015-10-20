// outputs webpack stats to console if there are no errors or warnings

function error(error)
{
	// BELLs when something goes wrong!
	console.log("\x07" + error)
}

function warning(warning)
{
	console.log(warning)
}

export default function notify_stats(stats, json)
{
	// if there were any errors
	if (json.errors.length > 0)
	{
		return json.errors.forEach(error)
	}

	// if there were any warnings
	if (json.warnings.length > 0)
	{
		json.warnings.forEach(warning)
	}

	// if it's ok
	console.log(stats.toString
	({
		chunks: false,
		colors: true
	}))
}