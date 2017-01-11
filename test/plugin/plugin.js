import fs from 'fs'
import path from 'path'

import chai from 'chai'
import plugin from '../../source/plugin/plugin.js'
import { extract_path } from '../../source/plugin/write assets.js'

import { extend, camel_case } from '../../source/helpers'

chai.should()

const webpack_stats = require(path.resolve(__dirname, 'webpack-stats.json'))

const expected_webpack_assets =
{
	"javascript":
	{
		"main": "http://127.0.0.1:3001/assets/main.6c2b37c0fc8c0592e2d3.js",
    "vendor": "http://127.0.0.1:3001/assets/vendor.js?hash=6c2b37c0fc8c0592e2d3"
	},
	"styles":
	{
		"main": "http://127.0.0.1:3001/assets/main.6c2b37c0fc8c0592e2d3.css",
    "vendor": "http://127.0.0.1:3001/assets/vendor.css?hash=6c2b37c0fc8c0592e2d3"
	},
	"assets":
	{
		"./assets/husky.jpg": "http://127.0.0.1:3001/assets/9059f094ddb49c2b0fa6a254a6ebf2ad.jpg",
		"./assets/style.scss": "body {} .child { background: url(http://127.0.0.1:3001/assets/test.jpg) } .multiple { background: url(http://127.0.0.1:3001/assets/correct.jpg) } .test_require_module { alias } head {}",
		"./assets/multiple/candidates.scss": ".multiple { background: url(http://127.0.0.1:3001/assets/correct.jpg) }",
		"./assets/child.scss": ".child { background: url(http://127.0.0.1:3001/assets/test.jpg) }",
		"./multiple/candidates.scss": ".multiple {}",
		// "/path/to/aliased_module_name/style.scss": ".aliased {}",
		"./aliasing test.jpg": "blah blah",
		"../node_modules/aliased_module_name/test.jpg": "blah",
		"./assets/test.text_parser_test": "text parser test",
		"./assets/test.object_parser_test.extra": { one: 1 }
	}
}

const webpack_configuration =
{
	context: __dirname,

	module:
	{
		loaders: []
	}
}

const webpack_assets_path = path.resolve(__dirname, '../webpack-assets.json')
const webpack_stats_path = path.resolve(__dirname, 'webpack-stats.json')

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

	// clear require() cache
	delete require.cache[webpack_stats_path]

	// delete webpack-stats.json if it exists
	if (fs.existsSync(webpack_stats_path))
	{
		// delete it
		fs.unlinkSync(webpack_stats_path)

		// ensure webpack-stats.json was deleted
		if (fs.existsSync(webpack_stats_path))
		{
			throw new Error('Failed to delete webpack-stats.json')
		}
	}
}

const settings = () =>
({
	debug: true,

	webpack_assets_file_path: webpack_assets_path,
	webpack_stats_file_path: webpack_stats_path,

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

	it('should generate correct webpack-assets.json', function(done)
	{
		// aliasing node_modules
		const aliases = { 'original_module_name': 'aliased_module_name' }

		const plugin_settings = extend({}, settings(), { alias: aliases })

		// temporarily set NODE_ENV to "development"
		const NODE_ENV = process.env.NODE_ENV
		process.env.NODE_ENV = 'development'

		new plugin(plugin_settings).apply
		({
			options: webpack_configuration,

			plugin: function(phase, callback)
			{
				callback({ toJson: () => webpack_stats, toString: () => 'stats' })

				require(webpack_assets_path).should.deep.equal(expected_webpack_assets)

				done()
			}
		})

		// restore NODE_ENV
		process.env.NODE_ENV = NODE_ENV
	})

	it('should throw errors for misconfiguration', function(done)
	{
		const try_plugin = (webpack_configuration) =>
		{
			return () => new plugin(settings()).apply
			({
				options: webpack_configuration,

				plugin: function(phase, callback)
				{
				}
			})
		}

		try_plugin({}).should.throw('You must specify ".context" in your webpack configuration')

		done()
	})

	it('should throw errors for regular expressions', function(done)
	{
		const plugin_instance = new plugin(settings())
		plugin_instance.apply
		({
			options: webpack_configuration,

			plugin: function(phase, callback)
			{
				const absent_asset_type = () => plugin_instance.regular_expression('absent')

				absent_asset_type.should.throw('There\'s no asset type "absent"')

				const absent_extensions = () => plugin.regular_expression('absent')

				absent_extensions.should.throw('You were expected to pass a list of extensions (an array)')

				done()
			}
		})
	})

	it('should work in debug mode and development mode', function(done)
	{
		new plugin(extend({ debug: true }, settings())).apply
		({
			options: webpack_configuration,

			plugin: function(phase, callback)
			{
				callback
				({
					toJson: () =>
					{
						const stats =
						{
							errors: [],
							warnings: [],
							assetsByChunkName: { main: 'main' },
							modules:
							[{
								id: 1,
								name: 'whatever.jpg',
								source: undefined
							}, {
								id: 2,
								name: 'kitten.jpg',
								source: 'blah'
							}, {
								id: 3,
								name: 'kitten.jpg',
								source: 'blah'
							}]
						}
						return stats
					},
					toString: () => 'stats'
				})

				done()
			}
		})
	})

	it('should parse various loaders', function()
	{
		// maybe write proper test for these (with compilation)

		plugin.url_loader_parser({ source: 'abc.jpg' }).should.equal('abc.jpg')

		plugin.css_loader_parser({ source: 'body {}' }).should.equal('body {}' + '\n module.exports = module.exports.toString();')

		plugin.css_modules_loader_parser({ source: 'body {}' }).should.equal('body {}' + '\n module.exports = exports.locals || {}; module.exports._style = exports.toString();')
	})

	it('should filter styles', function()
	{
		plugin.style_loader_filter({ name: './~/css-loader!abc.css' }, /abc\.css$/).should.equal(true)
	})

	it('should extract path from style loader', function()
	{
		plugin.style_loader_path_extractor({ name: './~/css-loader!abc.css' }).should.equal('abc.css')
	})

	it('should have camelCase aliases for all methods', function()
	{
		// Test the method has been called on the exported stuff

		const public_api =
		[
			'url_loader_parser',
			'css_loader_parser',
			'css_modules_loader_parser',
			'style_loader_filter',
			'style_loader_path_extractor'
		]

		for (let key of public_api)
		{
			plugin.should.have.property(camel_case(key))
		}

		// Test a couple of hard coded examples
		plugin.prototype.should.have.property('regularExpression')
		plugin.should.have.property('cssLoaderParser')
		plugin.cssLoaderParser.should.equal(plugin.css_loader_parser)
	})

	it('should extract path from string', function()
	{
		extract_path('abc.css').should.equal('abc.css')
    extract_path('abc.css?hash=123456').should.equal('abc.css')
	})
})
