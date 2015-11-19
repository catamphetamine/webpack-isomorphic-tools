import path from 'path'
import chai from 'chai'

import fs from 'fs'

import isomorpher from '../source/index'
import isomorpher_plugin from '../source/plugin/plugin'

import { extend } from './../source/helpers'

import Log from '../source/tools/log'

chai.should()

// logging
const log = new Log('testing', { debug: true })

const webpack_assets_path = path.resolve(__dirname, 'webpack-assets.json')

const webpack_assets = 
{
	"javascript":
	{
		"main": "/assets/main.6c2b37c0fc8c0592e2d3.js"
	},
	"styles":
	{
		"main": "/assets/main.6c2b37c0fc8c0592e2d3.css"
	},
	"assets":
	{
		"./assets/husky.jpg": "/assets/9059f094ddb49c2b0fa6a254a6ebf2ad.jpg",
		"./assets/style.scss": "body {} .child { background: url(/assets/test.jpg) } head {}",
		"./assets/child.scss": ".child { background: url(/assets/test.jpg) }",
		"./assets/test.text_parser_test": "text parser test",
		"./assets/test.object_parser_test.extra": { one: 1 },
		"./~/whatever.jpg": 1,
		"./~/aliased_module_name/test.jpg": true
	}
}

const webpack_configuration =
{
	context: __dirname,

	output:
	{
		publicPath: '/assets/'
	},

	module:
	{
		loaders: []
	}
}

const isomorpher_settings = () =>
({
	// debug: true, 

	webpack_assets_file_path: webpack_assets_path,

	assets:
	{
		javascript:
		{
			extension: 'js'
		},
		styles:
		{
			extension: 'scss'
		},
		images_and_fonts:
		{
			extensions:
			[
				'png',
				'jpg',
				'ico',
				'woff',
				'woff2',
				'eot',
				'ttf',
				'svg'
			]
		},
		text_parser_test:
		{
			extension: 'text_parser_test',
			parser: module => 'text parser test'
		},
		object_parser_test:
		{
			extension: 'object_parser_test',
			path: module => module.name + '.extra',
			parser: module => ({ one: 1 })
		}
	}
})

// deletes webpack-assets.json if it exists
function cleanup_webpack_assets()
{
	// clear require() cache
	delete require.cache[webpack_assets_path]

	// delete webpack-assets.json if it exists
	if (fs.existsSync(webpack_assets_path))
	{
		// delete it
		fs.unlinkSync(webpack_assets_path)

		// ensure webpack-assets.json was deleted
		if (fs.existsSync(webpack_assets_path))
		{
			throw new Error('Failed to delete webpack-assets.json')
		}
	}
}

// writes webpack-assets.json
function create_assets_file(data = webpack_assets)
{
	fs.writeFileSync(webpack_assets_path, JSON.stringify(data))
}

describe('plugin', function()
{
	beforeEach(function()
	{
		cleanup_webpack_assets()
	})

	afterEach(function()
	{
		cleanup_webpack_assets()
	})

	// this.timeout(5000)

	it('should generate regular expressions', function()
	{
		const settings = isomorpher_settings()

		const plugin = new isomorpher_plugin(settings).development()
		const server_side = new isomorpher(settings)

		// check resulting regular expressions

		const regular_expressions =
		{
			javascript       : /\.js$/,
			styles           : /\.scss$/,
			images_and_fonts : /\.(png|jpg|ico|woff|woff2|eot|ttf|svg)$/
		}

		for (let asset_type of Object.keys(regular_expressions))
		{
			plugin.regular_expression(asset_type).toString().should.equal(regular_expressions[asset_type].toString())
		}
	})

	it('should exclude files from require hooks', function()
	{
		const settings = isomorpher_settings()

		settings.assets.images_and_fonts.exclude = ['kitten.jpg', /^\.\/node_modules\/*/, path => path === 'function test']

		const plugin = new isomorpher_plugin(settings)
		const server_side = new isomorpher(settings)

		const excludes = path => server_side.excludes(path, settings.assets.images_and_fonts)

		// check require() hooks exclusion
		excludes('kitten.jpg.backup').should.be.false
		excludes('kitten.jpg').should.be.true
		excludes('./node_modules/fonts/style.css').should.be.true
		excludes('source/node_modules/fonts/style.css').should.be.false
		excludes('function test').should.be.true
	})

	it('should include files in require hooks', function()
	{
		const settings = isomorpher_settings()

		settings.assets.images_and_fonts.include = ['kitten.jpg', /^\.\/node_modules\/*/, path => path === 'function test']

		const plugin = new isomorpher_plugin(settings)
		const server_side = new isomorpher(settings)

		const includes = path => server_side.includes(path, settings.assets.images_and_fonts)

		// check require() hooks inclusion
		includes('kitten.jpg.backup').should.be.false
		includes('kitten.jpg').should.be.true
		includes('./node_modules/fonts/style.css').should.be.true
		includes('source/node_modules/fonts/style.css').should.be.false
		includes('function test').should.be.true
	})

	it('should wait for webpack-assets.json (callback)', function(done)
	{
		// ensure it waits for webpack-assets.json
		const server_side = new isomorpher(isomorpher_settings())

		// run server side instance
		server_side.server(webpack_configuration.context, () =>
		{
			// unmount require() hooks
			server_side.undo()

			// verify webpack-assets.json exists
			if (!fs.existsSync(webpack_assets_path))
			{
				return done(new Error('Should have waited for webpack-assets.json'))
			}

			// done
			done()
		})

		// create the webpack-assets.json (after a short delay)
		setTimeout(create_assets_file, 150)
	})

	it('should wait for webpack-assets.json (promise)', function(done)
	{
		// ensure it waits for webpack-assets.json
		const server_side = new isomorpher(isomorpher_settings()).development(false)

		// run server side instance
		server_side.server(webpack_configuration.context).then(() =>
		{
			// unmount require() hooks
			server_side.undo()

			// verify webpack-assets.json exists
			if (!fs.existsSync(webpack_assets_path))
			{
				return done(new Error('Should have waited for webpack-assets.json'))
			}

			// done
			done()
		})

		// create the webpack-assets.json (after a short delay)
		setTimeout(create_assets_file, 150)
	})

	it('should require assets on server', function(done)
	{
		// create the webpack-assets.json
		create_assets_file()

		// ensure it waits for webpack-assets.json
		const server_side = new isomorpher(isomorpher_settings())

		// install require() hooks
		server_side.server(webpack_configuration.context, () =>
		{
			// checks '/node_modules' -> '/~' case.
			// to do: should be a proper check
			require('./node_modules/whatever.jpg').should.equal(1)

			// verify asset value
			require('./assets/husky.jpg').should.equal(webpack_assets.assets['./assets/husky.jpg'])

			// unmount require() hooks
			server_side.undo()

			// done
			done()
		})
	})

	it('should refresh assets in development mode', function(done)
	{
		// create the webpack-assets.json
		create_assets_file()

		// ensure it waits for webpack-assets.json
		const server_side = new isomorpher(isomorpher_settings()).development()

		// install require() hooks
		server_side.server(webpack_configuration.context, () =>
		{
			// verify asset value
			require('./assets/husky.jpg').should.equal(webpack_assets.assets['./assets/husky.jpg'])

			// new asset data
			const data = extend({}, webpack_assets,
			{
				assets:
				{
					"./assets/husky.jpg": "woof"
				}
			})

			// throw new Error('intended')

			// create the webpack-assets.json
			create_assets_file(data)

			// refresh assets
			server_side.refresh()

			// verify that assets are refreshed
			require('./assets/husky.jpg').should.equal(data.assets['./assets/husky.jpg'])

			// unmount require() hooks
			server_side.undo()

			// done
			done()
		})
	})

	it('should correctly require aliased paths', function(done)
	{
		// https://webpack.github.io/docs/resolving.html#aliasing

		// create the webpack-assets.json
		create_assets_file()

		// aliasing node_modules
		const aliases = { 'original_module_name': 'aliased_module_name' }

		const settings = extend({}, isomorpher_settings(), { alias: aliases })

		// // will be checked against this value
		// const aliased_module_name_result = require('aliased_module_name')

		// ensure it waits for webpack-assets.json
		const server_side = new isomorpher(settings).development()

		// install require() hooks
		server_side.server(webpack_configuration.context, () =>
		{
			// verify aliasing

			// // should take the value from filesystem
			// require('original_module_name').should.equal(aliased_module_name_result)

			// should take the value from webpack-assets.json
			require('original_module_name/test.jpg').should.equal(true)

			const test = path => () => require(path)

			test('module_name_not_aliased').should.throw('module_name_not_aliased')
			test('./original_module_name').should.throw('/original_module_name')
			test('/original_module_name').should.throw('/original_module_name')

			// unmount require() hooks
			server_side.undo()

			// done
			done()
		})
	})

	it('should not refresh assets in production mode', function(done)
	{
		// create the webpack-assets.json
		create_assets_file()

		// ensure it waits for webpack-assets.json
		const server_side = new isomorpher(isomorpher_settings())

		// install require() hooks
		server_side.server(webpack_configuration.context, () =>
		{
			// refresh assets
			const refresh = () => server_side.refresh()

			// verify that refresh is not permitted in production mode
			refresh.should.throw('.refresh() called in production mode')

			// unmount require() hooks
			server_side.undo()

			// done
			done()
		})
	})

	it('should return undefined for assets which are absent from webpack assets', function(done)
	{
		// create the webpack-assets.json
		create_assets_file()

		// ensure it waits for webpack-assets.json
		const server_side = new isomorpher(isomorpher_settings()).development()

		// install require() hooks
		server_side.server(webpack_configuration.context, () =>
		{
			// verify asset value
			(typeof require('./assets/absent.jpg')).should.equal('undefined')

			// unmount require() hooks
			server_side.undo()

			// done
			done()
		})
	})

	it('should validate options', function()
	{
		let options = {}

		const instantiate = () => new isomorpher(options)

		instantiate.should.throw('You must specify "assets" parameter')

		options = { whatever: true }

		instantiate.should.throw('Unknown configuration parameter')

		options = { debug: 'true' }

		instantiate.should.throw('must be a boolean')

		options = { assets: 'true' }

		instantiate.should.throw('must be an object')

		options = { debug: true, webpack_assets_file_path: true }

		instantiate.should.throw('must be a string')

		options = { debug: true, webpack_stats_file_path: true }

		instantiate.should.throw('must be a string')

		options = { assets: { images: {} } }

		instantiate.should.throw('You must specify file extensions')

		options = { assets: { images: { extension: ['jpg'] } } }

		instantiate.should.throw('Use "extensions" key')

		options = { assets: { images: { extension: true } } }

		instantiate.should.throw('must be a string')

		options = { assets: { images: { extension: 'jpg', whatever: true } } }

		instantiate.should.throw('Unknown property "whatever"')

		options = { assets: { images: { extension: 'jpg', exclude: true } } }

		instantiate.should.throw('must be an array')

		options = { assets: { images: { extension: 'jpg', exclude: [true] } } }

		instantiate.should.throw('Unsupported object type for exclusion/inclusion "true"')

		options = { assets: { images: { extension: 'jpg', include: true } } }

		instantiate.should.throw('must be an array')

		options = { assets: { images: { extension: 'jpg', include: [true] } } }

		instantiate.should.throw('Unsupported object type for exclusion/inclusion "true"')

		options = { assets: { images: { extension: 'jpg', filter: true } } }

		instantiate.should.throw('"filter" must be a function')

		options = { assets: { images: { extension: 'jpg', path: 'true' } } }

		instantiate.should.throw('"path" must be a function')

		options = { assets: { images: { extension: 'jpg', parser: undefined } } }

		instantiate.should.throw('"parser" must be a function')
	})
})