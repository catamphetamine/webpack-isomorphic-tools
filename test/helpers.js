import chai from 'chai'
import { extend, alias_camel_case, replace_all } from './../source/helpers'

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
			}
		}

		extend(a, b)

		const ab =
		{
			a:
			{
				b: 1,
				c: 1
			}
		}

		a.should.deep.equal(ab)
	})

	it('should alias camel case', function()
	{
		const a = 
		{
			a: 1,

			b_cd_ef:
			{
				g_h: true
			}
		}

		const camel_cased_a =
		{
			a: 1,

			b_cd_ef:
			{
				g_h: true
			},
			
			bCdEf:
			{
				g_h: true
			}
		}

		alias_camel_case(a).should.deep.equal(camel_cased_a)
	})

	it('should replace strings', function()
	{
		replace_all('Testing \\ string', '\\', '-').should.equal('Testing - string')
	})
})