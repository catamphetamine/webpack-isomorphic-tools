import path from 'path'
import chai from 'chai'

import fs from 'fs'

import isomorpher from '../source/index'
import isomorpher_plugin from '../source/plugin/plugin'

import Log from '../source/tools/log'

chai.should()

// logging
const log = new Log('testing', { debug: true })

const webpack_assets_path = path.resolve(__dirname, 'webpack-assets.json')

const expected_webpack_assets = 
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
		"./assets/test.object_parser_test.extra": { one: 1 }
	}
}

const webpack_stats = require(path.resolve(__dirname, 'webpack-stats.stub.json'))

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
function create_assets_file()
{
	fs.writeFileSync(webpack_assets_path, expected_webpack_assets)
}

// to be fired when webpack-assets.json is created
function callback(done)
{
	if (!fs.existsSync(webpack_assets_path))
	{
		return done(new Error('Should have waited for webpack-assets.json'))
	}

	done()
}

describe('plugin', function()
{
	beforeEach(function()
	{
		cleanup_webpack_assets()
	})

	after(function()
	{
		cleanup_webpack_assets()
	})

	// this.timeout(5000)

	it('should generate regular expressions', function()
	{
		const settings = isomorpher_settings()

		const plugin = new isomorpher_plugin(settings)
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

	it('should generate correct webpack-assets.json', function(done)
	{
		const plugin = new isomorpher_plugin(isomorpher_settings())

		plugin.apply
		({
			options: webpack_configuration,

			plugin: function(phase, callback)
			{
				callback({ toJson: () => webpack_stats })

				require(webpack_assets_path).should.deep.equal(expected_webpack_assets)

				done()
			}
		})
	})

	it('should wait for webpack-assets.json (callback)', function(done)
	{
		// ensure it waits for webpack-assets.json
		const server_side = new isomorpher(isomorpher_settings())

		server_side.server(webpack_configuration.context, () =>
		{
			server_side.undo()
			callback(done)
		})

		// create the webpack-assets.json (after a short delay)
		setTimeout(create_assets_file, 150)
	})

	it('should wait for webpack-assets.json (promise)', function(done)
	{
		// ensure it waits for webpack-assets.json
		const server_side = new isomorpher(isomorpher_settings())

		server_side.server(webpack_configuration.context).then(() =>
		{
			server_side.undo()
			callback(done)
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

		server_side.server(webpack_configuration.context, () =>
		{
			require('./assets/husky.jpg').should.equal(expected_webpack_assets.assets['./assets/husky.jpg'])

			server_side.undo()
			callback(done)
		})
	})
})