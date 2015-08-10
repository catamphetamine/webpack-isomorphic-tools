'use strict'

// source:
// http://survivejs.com/webpack_react/authoring_libraries/

var path = require('path')

var webpack = require('webpack')
var HtmlWebpackPlugin = require('html-webpack-plugin')
var merge = require('webpack-merge')
var minimist = require('minimist')

var pkg = require('./package.json')

var process_arguments = minimist(process.argv.slice(2))

var action = process_arguments.action

if (!action)
{
	console.log('Action required.')
	console.log('Usage: webpack --target=[dev|gh-pages|build|build-minified]')
	return
}

var Root_folder = path.resolve(__dirname)
var Demo_folder = 'demo'

var babel = 'babel?optional[]=runtime&stage=0'

var config = 
{
	paths: 
	{
		dist: path.join(Root_folder, 'build'),
		src: path.join(Root_folder, 'source'),
		demo: path.join(Root_folder, Demo_folder),
		demoIndex: path.join(Root_folder, Demo_folder, '/index')
	},
	filename: 'webpack-isomorphic-tools',
	library: 'webpack-isomorphic-tools'
}

var merge_demo = merge.bind(null, 
{
	resolve: 
	{
		extensions: ['', '.js', '.jsx', '.md', '.css', '.png', '.jpg']
	},
	module: 
	{
		loaders: 
		[
			{
				test: /\.css$/,
				loaders: ['style', 'css']
			},
			{
				test: /\.md$/,
				loaders: ['html', 'highlight', 'markdown']
			},
			{
				test: /\.png$/,
				loader: 'url?limit=100000&mimetype=image/png',
				include: config.paths.demo
			},
			{
				test: /\.jpg$/,
				loader: 'file',
				include: config.paths.demo
			},
			{
				test: /\.json$/,
				loader: 'json'
			}
		]
	}
})

var merge_build = merge.bind(null, 
{
	devtool: 'source-map',
	output: 
	{
		path: config.paths.dist,
		libraryTarget: 'umd',
		library: config.library
	},
	entry: config.paths.src,
	externals: 
	{
		//// if you are not testing, just react will do
		//react: 'react',
		// 'react/addons': 'react/addons'
	},
	module: 
	{
		loaders: 
		[
			{
				test: /\.jsx?$/,
				loaders: [babel],
				include: config.paths.src
			}
		]
	}
})

switch (action)
{
    // Starts WebPack development server
	case 'dev':
		var IP = '0.0.0.0'
		var PORT = 3000

		module.exports = merge_demo
		({
			ip: IP,
			port: PORT,
			devtool: 'eval',
			entry: 
			[
				'webpack-dev-server/client?http://' + IP + ':' + PORT,
				'webpack/hot/only-dev-server',
				config.paths.demoIndex
			],
			output: 
			{
				path: __dirname,
				filename: 'bundle.js',
				publicPath: '/'
			},
			plugins: 
			[
				new webpack.DefinePlugin
				({
					'process.env': 
					{
						'NODE_ENV': JSON.stringify('development'),
					}
				}),
				new webpack.HotModuleReplacementPlugin(),
				new webpack.NoErrorsPlugin(),
				new HtmlWebpackPlugin()
			],
			module: 
			{
				preLoaders: 
				[
					{
						test: /\.jsx?$/,
						loaders: ['eslint', 'jscs'],
						include: [config.paths.demo, config.paths.src]
					}
				],
				loaders: 
				[
					{
						test: /\.jsx?$/,
						loaders: ['react-hot', babel],
						include: [config.paths.demo, config.paths.src]
					}
				]
			}
		})

		break

    // Generates a github pages website
	case 'gh-pages':
		module.exports = merge_demo
		({
			entry: 
			{
				app: config.paths.demoIndex,
				// tweak this to include your externs unless you load them some other way
				vendors: ['react/addons']
			},
			output: 
			{
				path: './gh-pages',
				filename: 'bundle.[chunkhash].js'
			},
			plugins: 
			[
				new webpack.DefinePlugin
				({
					'process.env': 
					{
						// This has effect on the react lib size
						'NODE_ENV': JSON.stringify('production'),
					}
				}),
				new webpack.optimize.DedupePlugin(),
				new webpack.optimize.UglifyJsPlugin
				({
					compress: 
					{
						warnings: false
					}
				}),
				new webpack.optimize.CommonsChunkPlugin('vendors', 'vendors.[chunkhash].js'),
				new HtmlWebpackPlugin
				({
					title: pkg.name + ' - ' + pkg.description
				})
			],
			module: 
			{
				loaders: 
				[
					{
						test: /\.jsx?$/,
						loaders: [babel],
						include: [config.paths.demo, config.paths.src]
					}
				]
			}
		})
	
		break

    // Builds the project into a single file
	case 'build':
		module.exports = merge_build
		({
			output: 
			{
				filename: config.filename + '.js'
			}
		})

		break

    // Builds the project into a single minified file
	case 'build-minified':
		module.exports = merge_build
		({
			output: 
			{
				filename: config.filename + '.minified.js'
			},
			plugins: 
			[
				new webpack.optimize.UglifyJsPlugin
				({
					compress: 
					{
						warnings: false
					}
				})
			]
		})

		break
}