import chai from 'chai'
import notify_stats from '../../source/plugin/notify stats.js'

chai.should()

describe('notify stats', function()
{
	it('should notify stats', function()
	{
		// some errors
		notify_stats({ a: true }, { errors: ['test error'] })

		// some warnings
		notify_stats({ a: true }, { errors: [], warnings: ['test warning'] })

		// no errors and warnings
		notify_stats({ toString: () => 'stats info' }, { errors: [], warnings: [] })
	})
})