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
		"./assets/images/husky.jpg": "var __webpack_public_path__ = \"/assets/\"; module.exports = __webpack_public_path__ + \"9059f094ddb49c2b0fa6a254a6ebf2ad.jpg\""
	}
}

const webpack_stats = require(path.resolve(__dirname, 'webpack-stats.json'))

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
			extension: 'js',
			parser: () => true
		},
		styles:
		{
			extension: 'scss',
			parser: () => true
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
			],
			parser: isomorpher_plugin.url_loader_parser
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

// creates webpack-assets.json after a short delay
function create_assets_file()
{
	setTimeout(function()
	{
		fs.writeFileSync(webpack_assets_path, expected_webpack_assets)
	},
	150)
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
		new isomorpher(isomorpher_settings()).server(webpack_configuration.context, () => callback(done))

		// create the webpack-assets.json
		create_assets_file()
	})

	it('should wait for webpack-assets.json (promise)', function(done)
	{
		// ensure it waits for webpack-assets.json
		new isomorpher(isomorpher_settings()).server(webpack_configuration.context).then(() => callback(done))

		// create the webpack-assets.json
		create_assets_file()
	})
})