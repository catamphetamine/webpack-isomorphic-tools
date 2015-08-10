import path from 'path'
import chai from 'chai'
import isomorpher from './../source/index'

chai.should()

describe('isomorpher', function()
{
	it('should do what it does', function()
	{
		const webpack_configuration =
		{
			context: '/blah',

			output:
			{
				path: '/',
				publicPath: '/statics'
			},

			module:
			{
				loaders: []
			}
		}

		new isomorpher(webpack_configuration,
		{
			assets:
			[{
				extension: 'js',
				paths:
				[
					path.resolve(__dirname, 'code', 'client'),
					path.resolve(__dirname, 'code', 'language.js')
				],
				loader: 'babel-loader?stage=0&optional=runtime&plugins=typecheck'
			},
			{
				extension: 'scss',
				path: path.resolve(__dirname, 'statics'),
				loaders: 
				[
					'style-loader',
					'css-loader?modules&importLoaders=2&sourceMap&localIdentName=[local]___[hash:base64:5]',
					'autoprefixer-loader?browsers=last 2 version',
					'sass-loader?outputStyle=expanded&sourceMap=true&sourceMapContents=true'
				]
			},
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
				path: path.resolve(__dirname, 'statics'),
				loaders: ['url-loader?limit=10240'] // Any png-image or woff-font below or equal to 10K will be converted to inline base64 instead
			}]
		})
		.populate(webpack_configuration)

		// regular_expressions.javascript.toString().should.equal('/\\.js$/')
		// regular_expressions.styles.toString().should.equal('/\\.scss$/')
		// regular_expressions.images_and_fonts.toString().should.equal('/\\.(png|jpg|ico|woff|woff2|eot|ttf|svg)$/')

		const regular_expressions =
		{
			javascript       : /\.js$/,
			styles           : /\.scss$/,
			images_and_fonts : /\.(png|jpg|ico|woff|woff2|eot|ttf|svg)$/
		}

		webpack_configuration.module.loaders.should.deep.equal
		([
			{
				test: regular_expressions.javascript,
				include:
				[
					path.resolve(__dirname, 'code', 'client'),
					path.resolve(__dirname, 'code', 'language.js')
				],
				loader: 'babel-loader?stage=0&optional=runtime&plugins=typecheck'
			},
			{
				test: regular_expressions.styles,
				include:
				[
					path.resolve(__dirname, 'statics')
				],
				loaders: 
				[
					'style-loader',
					'css-loader?modules&importLoaders=2&sourceMap&localIdentName=[local]___[hash:base64:5]',
					'autoprefixer-loader?browsers=last 2 version',
					'sass-loader?outputStyle=expanded&sourceMap=true&sourceMapContents=true'
				]
			},
			{
				test: regular_expressions.images_and_fonts,
				include:
				[
					path.resolve(__dirname, 'statics')
				],
				loaders: ['url-loader?limit=10240']
			}
		])
	})
})