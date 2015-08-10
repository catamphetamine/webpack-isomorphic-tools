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

module.exports = function notify_stats(stats)
{
	var json = stats.toJson()

	// if there were any errors
	if (json.errors.length > 0)
	{
		json.errors.forEach(error)
	}
	// if there were any warnings
	else if (json.warnings.length > 0)
	{
		json.warnings.forEach(warning)
	}
	// if it's ok
	else
	{
		console.log(stats.toString
		({
			chunks: false,
			colors: true
		}))
	}
}