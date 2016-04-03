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
	objects = objects.filter(x => exists(x))

	if (objects.length === 0)
	{
		return
	}
	
	if (objects.length === 1)
	{
		return objects[0]
	}

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
		else if (Array.isArray(from[key]))
		{
			if (!Array.isArray(to[key]))
			{
				to[key] = []
			}

			to[key] = to[key].concat(clone(from[key]))
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
	if (is_object(object))
	{
		return merge({}, object)
	}
	else if (Array.isArray(object))
	{
		return object.map(x => clone(x))
	}
	else
	{
		return object
	}
}

// converts all camelCased keys of an object to lodash style
export function convert_from_camel_case(object)
{
	for (let key of Object.keys(object))
	{
		if (/[A-Z]/.test(key))
		{
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
	let j = substring.length

	if (j > string.length)
	{
		return false
	}

	while (j > 0)
	{
		j--

		if (string[j] !== substring[j])
		{
			return false
		}
	}

	return true
}

export function ends_with(string, substring)
{
	let i = string.length
	let j = substring.length

	if (j > i)
	{
		return false
	}

	while (j > 0)
	{
		i--
		j--

		if (string[i] !== substring[j])
		{
			return false
		}
	}

	return true

	// const index = string.lastIndexOf(substring)
	// return index >= 0 && index === string.length - substring.length
}

export function is_empty(array)
{
	return array.length === 0
}

export function not_empty(array)
{
	return array.length > 0
}

// repeat string N times
export function repeat(what, times)
{
	let result = ''
	while (times > 0)
	{
		result += what
		times--
	}
	return result
}

// if the text is blank
export function is_blank(text)
{
	return !exists(text) || !text.replace(/\s/g, '')
}

// zips two arrays
export function zip(a, b)
{
	return a.map(function(_, index) 
	{
		return [a[index], b[index]]
	})
}

// last element of an array
export function last(array)
{
	return array[array.length - 1]
}

/**
 * Returns a camel case variant of the string, unless it's in TitleCase.
 * @param {string} string
 */
export function camel_case(string)
{
	const nameParts = string.split('_')
	return nameParts.slice(1).reduce((reduced, current) =>
	{
		return reduced + current.charAt(0).toUpperCase() + current.slice(1)
	},
	nameParts[0])
}

// detects "private" object properties (just in case there are any)
const is_private_property = name => starts_with(name, '__')

/**
 * Creates camel case variants of the attributes on the object
 * @param {object} object
 */
export function alias_properties_with_camel_case(object)
{
	for (let key of Object.keys(object).filter(key => !is_private_property(key)))
	{
		object[camel_case(key)] = object[key]
	}
}
