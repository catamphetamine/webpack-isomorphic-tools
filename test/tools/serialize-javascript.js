import chai from 'chai'
import serialize from '../../source/tools/serialize-javascript'

chai.should()

describe('serialize-javascript', function()
{
	it('should serialize all types of things', function()
	{
		const a = 
		{
			a: /\n/g,
			b: function() { console.log('...') },
			c: undefined
		}

		const expected = `{"a":/\\n/g,"b":function b() {
				console.log('...');
			}}`

		serialize(undefined).should.equal('undefined')

		serialize(a).should.equal(expected)
	})
})