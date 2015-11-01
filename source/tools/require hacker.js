// Hacking too much time

// will be moved here:
// https://github.com/halt-hammerzeit/require-hacker
//
// and separated into an npm package

// Based on Node.js Module class sources:
// https://github.com/nodejs/node/blob/master/lib/module.js

import fs     from 'fs'
import path   from 'path'
import Module from 'module'

import Log from '../tools/log'

const original_findPath = Module._findPath

export default class Require_hacker
{
	abstract_path_resolvers = []
	
	// original_loaders = {}

	abstract_path_resolved_modules = {}

	constructor(options)
	{
		// // take the passed in options
		// this.options = clone(options)

		// logging
		this.log = new Log('require-hook', { debug: options.debug }) // this.options.debug

		// instrument Module._findPath
		// https://github.com/nodejs/node/blob/master/lib/module.js#L335-L341
		Module._findPath = (...parameters) =>
		{
			const request = parameters[0]
			// const paths = parameters[1]

			const filename = original_findPath.apply(undefined, parameters)
			if (filename !== false)
			{
				return filename
			}

			for (let resolver of this.abstract_path_resolvers)
			{
				const resolved = resolver.resolve(request)
				if (typeof resolved !== 'undefined')
				{
					return resolved
				}
			}

			return false
		}
	}

	// installs a require() hook for paths 
	// which don't exist in the filesystem
	//
	// (if these paths exist in the filesystem
	//  then use the .hook(extension, resolve) method instead)
	//
	// id - a meaningful textual identifier
	//
	// resolver - a function which takes two parameters:
	//
	//              the path to be resolved
	//
	//              a function which flushes require() cache for this path
	//              with no parameters
	//
	//            must return a javascript CommonJS module source code
	//            (i.e. "module.exports = ...", etc)
	//
	// returns an object with an .undo() method
	//
	resolver(id, resolver)
	{
		validate.resolver(id, resolver)

		const resolver_entry = 
		{
			id,
			resolve: path =>
			{
				const resolved_path = `${path}.${id}`
				const flush_cache = () => delete require.cache[resolved_path]
				
				// CommonJS module source code
				const source = resolver(path, flush_cache)
				
				if (typeof source === 'undefined')
				{
					return
				}
				
				this.abstract_path_resolved_modules[resolved_path] = source
				return resolved_path
			}
		}

		this.abstract_path_resolvers.push(resolver_entry)

		const hook = this.hook(id, path => 
		{
			const source = this.abstract_path_resolved_modules[path]
			delete this.abstract_path_resolved_modules[path]
			return source
		})

		const result =
		{
			undo: () =>
			{
				// javascript arrays still have no .remove() method in the XXI-st century
				this.abstract_path_resolvers = this.abstract_path_resolvers.filter(x => x !== resolver_entry)
				hook.unhook()
			}
		}

		return result
	}

	// installs a require() hook for the extension
	//
	// extension - a file extension to hook into require()s of
	//             (examples: 'css', 'jpg', 'js')
	//
	// resolve   - a function that takes two parameters: 
	//
	//               the path requested in the require() call 
	//
	//               and a fallback function (fall back to default behaviour)
	//               with no parameters
	//
	//             must return a javascript CommonJS module source code
	//             (i.e. "module.exports = ...", etc)
	//
	hook(extension, resolve)
	{
		this.log.debug(`Hooking into *.${extension} files loading`)
		
		// validation
		validate.extension(extension)
		validate.resolve(resolve)

		// dotted extension
		const dot_extension = `.${extension}`

		// keep original extension loader
		const original_loader = Module._extensions[dot_extension]

		// display a warning in case of extension loader override
		if (original_loader)
		{
			this.log.warning(`-------------------------------------------------------------`)
			this.log.warning(`Overriding require() hook for file extension ${dot_extension}`)
			this.log.warning(`-------------------------------------------------------------`)
		}

		// set new loader for this extension
		Module._extensions[dot_extension] = (module, filename) =>
		{
			this.log.debug(`Loading source code for ${filename}`)

			// fallback flag
			let aborted = false

			// var source = fs.readFileSync(filename, 'utf8')
			const source = resolve(filename, () =>
			{
				this.log.debug(`Fallback to original loader`)

				// fallen back
				aborted = true

				// this message would appear if there was no loader 
				// for the extension of the filename
				if (path.extname(filename) !== dot_extension)
				{
					this.log.info(`Trying to load "${path.basename(filename)}" as a "*${dot_extension}"`)
				}

				// load the file with the original loader
				(original_loader || Module._extensions['.js'])(module, filename)
			})

			// if fallen back - exit
			if (aborted)
			{
				return
			}

			// compile javascript module from its source
			// https://github.com/nodejs/node/blob/master/lib/module.js#L379
			module._compile(source, filename)
		}

		const result = 
		{
			// uninstall the hook
			unhook: () =>
			{
				Module._extensions[dot_extension] = original_loader
			}
		}

		return result
	}

	// // uninstalls a previously installed require() hook for the extension
	// //
	// // extension - the file extension for which to uninstall 
	// //             the previously installed require() hook
	// //
	// unhook(extension)
	// {
	// 	this.log.debug(`Unhooking from .${extension} files loading`)
	//
	// 	// validation
	// 	validate.extension(extension)
	//
	// 	// dotted extension
	// 	const dot_extension = `.${extension}`
	//
	// 	// verify that the hook exists in the first place
	// 	if (Object.keys(this.original_loaders).indexOf(dot_extension) < 0)
	// 	{
	// 		throw new Error(`Require() hook wasn't previously installed for ${dot_extension} files`)
	// 	}
	//
	// 	// uninstall the hook
	// 	Module._extensions[dot_extension] = this.original_loaders[dot_extension]
	// 	delete this.original_loaders[dot_extension]
	// }
}

// validation
const validate =
{
	extension(extension)
	{
		if (typeof extension !== 'string')
		{
			throw new Error(`Expected string extension. Got ${extension}`)
		}

		if (path.extname(`test.${extension}`) !== `.${extension}`)
		{
			throw new Error(`Invalid file extension ${extension}`)
		}
	},

	resolve(resolve)
	{
		if (typeof resolve !== 'function')
		{
			throw new Error(`Resolve should be a function. Got ${resolve}`)
		}
	},

	resolver(id, resolver)
	{
		if (!id)
		{
			throw new Error(`You must specify resolver id`)
		}

		if (path.extname(`test.${id}`) !== `.${id}`)
		{
			throw new Error(`Invalid resolver id. Expected a valid file extension.`)
		}
	}
}