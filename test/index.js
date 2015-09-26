import path from 'path'
import chai from 'chai'
import isomorpher from './../source/index'
import isomorpher_plugin from './../source/plugin/plugin'

chai.should()

describe('plugin', function()
{
	it('should generate regular expressions', function()
	{
		const webpack_configuration =
		{
			context: '/blah',

			output:
			{
				publicPath: '/asdf'
			},

			module:
			{
				loaders: []
			}
		}

		const isomorpher_settings = 
		{
			exclude: ['kitten.jpg', /^\.\/node_modules\/*/],

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
				}
			}
		}

		const plugin = new isomorpher_plugin(isomorpher_settings)
		const server_side = new isomorpher(isomorpher_settings)

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

		// check require() hooks exclusion
		server_side.excludes('kitten.jpg.backup').should.be.false
		server_side.excludes('kitten.jpg').should.be.true
		server_side.excludes('./node_modules/fonts/style.css').should.be.true
		server_side.excludes('source/node_modules/fonts/style.css').should.be.false
	})
})