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

		const plugin = new isomorpher_plugin
		({
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
		})

		// regular_expressions.javascript.toString().should.equal('/\\.js$/')
		// regular_expressions.styles.toString().should.equal('/\\.scss$/')
		// regular_expressions.images_and_fonts.toString().should.equal('/\\.(png|jpg|ico|woff|woff2|eot|ttf|svg)$/')

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
})