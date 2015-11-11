import chai from 'chai'
import { exists, is_object, extend, merge, clone, convert_from_camel_case, replace_all, starts_with, ends_with, is_empty, not_empty, repeat, is_blank, zip } from '../source/helpers'

chai.should()

describe('helpers', function()
{
	it('should extend JSON objects', function()
	{
		const a = 
		{
			a:
			{
				b: 1
			}
		}

		const b =
		{
			a:
			{
				c: 1
			},
			d:
			{
				e: 2
			}
		}

		const c =
		{
			d:
			{
				e: 3,
				f: 4
			}
		}

		extend(a, b, c)

		b.d.e.should.equal(2)

		const ab =
		{
			a:
			{
				b: 1,
				c: 1
			},
			d:
			{
				e: 3,
				f: 4
			}
		}

		a.should.deep.equal(ab)
	})

	it('should detect if variable exists', function()
	{
		exists(0).should.equal(true)
		exists('').should.equal(true)
		exists(null).should.equal(true)
		exists([]).should.equal(true)
		exists(undefined).should.equal(false)
	})

	it('should detect JSON objects', function()
	{
		is_object({}).should.equal(true)
		is_object(0).should.equal(false)
		is_object('').should.equal(false)
		is_object(null).should.equal(false)
		is_object([]).should.equal(false)
		is_object(undefined).should.equal(false)
	})

	it('should merge objects', function()
	{
		const a = { b: { c: 1 }}
		const b = merge(a, { b: { c: 2 }})

		a.b.c.should.equal(1)
		b.b.c.should.equal(2)
	})

	it('should clone objects', function()
	{
		const a = { b: { c: 1 }}
		const b = clone(a)

		a.b.c = 2
		b.b.c.should.equal(1)
	})

	it('should convert from camel case', function()
	{
		const camel_cased_a =
		{
			a: 1,
			
			bCdEf:
			{
				g_h: true
			}
		}

		const a = 
		{
			a: 1,

			b_cd_ef:
			{
				g_h: true
			}
		}

		convert_from_camel_case(camel_cased_a).should.deep.equal(a)
	})

	it('should replace strings', function()
	{
		replace_all('Testing \\ string', '\\', '-').should.equal('Testing - string')
	})

	it('should determine if a string starts with a substring', function()
	{
		starts_with('#$% test', '#').should.equal(true)
		starts_with('#$% test', '$').should.equal(false)
	})

	it('should determine if a string ends with a substring', function()
	{
		ends_with('#$% test !', '!').should.equal(true)
		ends_with('#$% test !', '#').should.equal(false)
	})

	it('should determine if an array is (not) empty', function()
	{
		is_empty([]).should.equal(true)
		is_empty([0]).should.equal(false)

		not_empty([]).should.equal(false)
		not_empty([0]).should.equal(true)
	})

	it('should repeat strings', function()
	{
		repeat('abc', 3).should.equal('abcabcabc')
	})

	it('should test if a string is blank', function()
	{
		is_blank('abc').should.equal(false)
		is_blank('').should.equal(true)
		is_blank(' ').should.equal(true)
		is_blank(' \t\n').should.equal(true)
		is_blank(' \t\n a').should.equal(false)
	})

	it('should zip arrays', function()
	{
		zip([], []).should.deep.equal([])
		zip([1], []).should.deep.equal([[1, undefined]])
		zip([1, 2, 3], [4, 5, 6]).should.deep.equal([[1, 4], [2, 5], [3, 6]])
	})
})