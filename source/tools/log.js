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
	info(...parameters)
	{
		console.log(this.preamble, generate_log_message(parameters))
	}

	// outputs debugging info to the log
	debug(...parameters)
	{
		if (this.options.debug)
		{
			console.log(this.preamble, '[debug]', generate_log_message(parameters))
		}
	}

	// outputs minor debugging info to the log
	trace(...parameters)
	{
		if (this.options.debug)
		{
			console.log(colors.gray(this.preamble, '[trace]', generate_log_message(parameters)))
		}
	}

	// outputs a warning to the log
	warning(...parameters)
	{
		console.log(colors.yellow(this.preamble, '[warning]', generate_log_message(parameters)))
	}

	// outputs an error to the log
	error(...parameters)
	{
		console.log(colors.red(this.preamble, '[error]', generate_log_message(parameters)))
	}
}

// transforms arguments to text
function generate_log_message(parameters)
{
	// преобразовать все аргументы функции в текстовый вид
	return parameters.map(argument =>
	{
		// преобразование объектов в строку
		if (typeof argument === 'object')
		{
			// для ошибок - распечатывать стек вызовов
			if (argument instanceof Error)
			{
				return argument.stack
			}
			// для остальных объектов вызывать JSON.stringify()
			return JSON.stringify(argument, null, 2)
		}
		// если undefined
		if (typeof argument === 'undefined')
		{
			return '[undefined]'
		}
		// прочие переменные - просто .toString()
		return argument.toString()
	})
	// собрать всё это в одну строку через пробел
	.reduce((message, argument) =>
	{
		if (message.length > 0)
		{
			message += ' '
		}
		return message + argument
	},
	'')
}