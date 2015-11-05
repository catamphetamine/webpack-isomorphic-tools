// // if the variable is defined
export const exists = what => typeof what !== 'undefined'

// used for JSON object type checking
const object_constructor = {}.constructor

// detects a JSON object
export function is_object(object)
{
	return exists(object) && (object !== null) && object.constructor === object_constructor
}

// extends the first object with 
/* istanbul ignore next: some weird transpiled code, not testable */
export function extend(...objects)
{
	const to   = objects[0]
	const from = objects[1]

	if (objects.length > 2)
	{
		const last = objects.pop()
		const intermediary_result = extend.apply(this, objects)
		return extend(intermediary_result, last)
	}

	for (let key of Object.keys(from))
	{
		if (is_object(from[key]))
		{
			if (!is_object(to[key]))
			{
				to[key] = {}
			}

			extend(to[key], from[key])
		}
		else
		{
			to[key] = from[key]
		}
	}

	return to
}

export function merge()
{
	const parameters = Array.prototype.slice.call(arguments, 0)
	parameters.unshift({})
	return extend.apply(this, parameters)
}

export function clone(object)
{
	return merge({}, object)
}

// creates camelCased aliases for all the keys of an object
export function convert_from_camel_case(object)
{
	for (let key of Object.keys(object))
	{
		if (/[A-Z]/.test(key))
		// if (key.indexOf('_') >= 0)
		{
			// const camel_cased_key = key.replace(/_(.)/g, function(match, group_1)
			// {
			// 	return group_1.toUpperCase()
			// })

			// if (!exists(object[camel_cased_key]))
			// {
			// 	object[camel_cased_key] = object[key]
			// 	delete object[key]
			// }

			const lo_dashed_key = key.replace(/([A-Z])/g, function(match, group_1)
			{
				return '_' + group_1.toLowerCase()
			})

			if (!exists(object[lo_dashed_key]))
			{
				object[lo_dashed_key] = object[key]
				delete object[key]
			}
		}
	}

	return object
}

function escape_regexp(string)
{
	const specials = new RegExp("[.*+?|()\\[\\]{}\\\\]", 'g')
	return string.replace(specials, "\\$&")
}

export function replace_all(where, what, with_what)
{
	const regexp = new RegExp(escape_regexp(what), 'g')
	return where.replace(regexp, with_what)
}

export function starts_with(string, substring)
{
	return string.indexOf(substring) === 0
}

export function ends_with(string, substring)
{
	const index = string.lastIndexOf(substring)
	return index >= 0 && index === string.length - substring.length
}