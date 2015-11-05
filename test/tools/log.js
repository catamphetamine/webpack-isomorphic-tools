import chai from 'chai'
import Log from '../../source/tools/log'

chai.should()

describe('log', function()
{
	it('should log', function()
	{
		const log = new Log('test', { debug: true })

		log.info('info')
		log.debug('debug')
		log.trace('trace')
		log.warning('warning')
		log.error('error')
		log.error(new Error('error'))
		log.error({ key: 'error'}, 'error')
		log.error(undefined)

		const log_info = new Log('test', { debug: false })

		log_info.trace('no trace')
		log_info.debug('no debug')
	})
})