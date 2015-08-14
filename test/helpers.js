import chai from 'chai'
import { extend } from './../source/helpers'

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
})