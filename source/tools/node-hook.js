// read this article for more info on what's going on here
// http://bahmutov.calepin.co/hooking-into-node-loader-for-fun-and-profit.html

// based on https://github.com/bahmutov/node-hook

// based on https://github.com/gotwarlost/istanbul/blob/master/lib/hook.js

// Also see: https://github.com/nodejs/node/blob/master/lib/module.js

/*
 Copyright (c) 2012, Yahoo! Inc.  All rights reserved.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */

var fs = require('fs')
var path = require('path')
var Module = require('module')

var serialize = require('./serialize-javascript')

var originalLoaders = {}

var verify =
{
	extension: function (str)
	{
		if (typeof str !== 'string')
		{
			throw new Error('expected string extension, have ' + str);
		}
		if (str[0] !== '.')
		{
			throw new Error('Extension should start with dot, for example .js, have ' + str);
		}
	},
	transform: function (fn)
	{
		if (typeof fn !== 'function')
		{
			throw new Error('Transform should be a function, have ' + fn);
		}
	}
}

// function fallback()
// {
// 	module._compile(fs.readFileSync(filename), filename)
// }

function hook(extension, transform, options)
{
	options = options || {}

	if (typeof extension === 'function' && typeof transform === 'undefined')
	{
		transform = extension
		extension = '.js'
	}

	if (options.verbose)
	{
		console.log('hooking transform', transform.name, 'for', extension)
	}

	verify.extension(extension)
	verify.transform(transform)

	originalLoaders[extension] = Module._extensions[extension]

	Module._extensions[extension] = function(module, filename)
	{
		if (options.verbose)
		{
			console.log('transforming', filename)
		}

		var aborted = false

		// var source = fs.readFileSync(filename, 'utf8')
		var result = transform(filename, function fallback()
		{
			aborted = true

			if (path.extname(filename) !== extension)
			{
				console.log('Trying to load "' + path.basename(filename) + '" as a "*' + extension + '"')
			}

			(originalLoaders[extension] || Module._extensions['.js'])(module, filename)
		})

		if (aborted)
		{
			return
		}

		// generate javascript module source code based on the `result` variable
		var source = result
		if (typeof source === 'string')
		{
			// if `result` is just a string, not a module definition,
			// convert it to a module definition
			if (source.indexOf('module.exports = ') < 0)
			{
				source = 'module.exports = ' + JSON.stringify(source)
			}
		}
		else
		{
			// if `result` is an object, convert it to a module definition
			source = 'module.exports = ' + serialize(result)
		}

		// compile javascript module from its source
		// https://github.com/nodejs/node/blob/master/lib/module.js#L379
		module._compile(source, filename)
	}

	if (options.verbose)
	{
		console.log('hooked function')
	}
}

function unhook(extension)
{
	if (typeof extension === 'undefined')
	{
		extension = '.js'
	}
	verify.extension(extension)
	Module._extensions[extension] = originalLoaders[extension]
}

module.exports =
{
	hook: hook,
	unhook: unhook
}