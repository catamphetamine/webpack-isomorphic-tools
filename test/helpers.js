import chai from 'chai'
import { extend, convert_from_camel_case, replace_all, starts_with, ends_with } from './../source/helpers'

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
})