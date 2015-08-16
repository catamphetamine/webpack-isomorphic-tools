import colors from 'colors/safe'

export default class Log
{
	constructor(preamble, options)
	{
		this.options = options

		// is prepended to console output
		this.preamble = `[${preamble}]`
	}

	// outputs info to the log
	info(message)
	{
		console.log(this.preamble, generate_log_message(message))
	}

	// outputs debugging info to the log
	debug(message)
	{
		if (this.options.debug)
		{
			console.log(this.preamble, '[debug]', generate_log_message(message))
		}
	}

	// outputs a warning to the log
	warning(message)
	{
		console.log(colors.yellow(this.preamble, '[warning]', generate_log_message(message)))
	}

	// outputs an error to the log
	error(message)
	{
		console.log(colors.red(this.preamble, '[error]', generate_log_message(message)))
	}
}

// transforms arguments to text
function generate_log_message(message)
{
	if (typeof message === 'object')
	{
		return JSON.stringify(message, null, 2)
	}
	return message
}