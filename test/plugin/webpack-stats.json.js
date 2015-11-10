module.exports = 
{
	"hash": "6c2b37c0fc8c0592e2d3",
	"publicPath": "http://127.0.0.1:3001/assets/",

	"assetsByChunkName":
	{
		"main":
		[
			"main.6c2b37c0fc8c0592e2d3.js",
			"main.6c2b37c0fc8c0592e2d3.css"
		]
	},

	"assets":
	[{
		"name": "main.6c2b37c0fc8c0592e2d3.js",
		"size": 4632480,
		"chunks": [0],
		"chunkNames": ["main"],
		"emitted": true
	},{
		"name": "main.6c2b37c0fc8c0592e2d3.css",
		"size": 1234567,
		"chunks": [0],
		"chunkNames": ["main"],
		"emitted": true
	}],

	"chunks":
	[{
		"id": 0,
		"names": ["main"],
		"files":
		[
			"main.6c2b37c0fc8c0592e2d3.js",
			"main.6c2b37c0fc8c0592e2d3.css"
		]
	}],

	"modules": 
	[{
		"id": 123,
		"identifier": "G:\\work\\webapp\\node_modules\\url-loader\\index.js?limit=10240!G:\\work\\webapp\\assets\\husky.jpg",
		"name": "./assets/husky.jpg",
		"chunks": [0],
		"assets": ["9059f094ddb49c2b0fa6a254a6ebf2ad.jpg"],
		"issuer": "G:\\work\\webapp\\node_modules\\babel-loader\\index.js?{\"plugins\":[\"G:\\\\work\\\\webapp\\\\code\\\\babel_relay_plugin\",\"react-transform\"],\"extra\":{\"react-transform\":{\"transforms\":[{\"transform\":\"react-transform-hmr\",\"imports\":[\"react\"],\"locals\":[\"module\"]}]}}}!G:\\work\\webapp\\code\\client\\pages\\home.js",
		"reasons": 
		[{
			"userRequest": "./assets/husky.jpg"
		}],
		"source": "module.exports = __webpack_public_path__ + \"9059f094ddb49c2b0fa6a254a6ebf2ad.jpg\""
	},
	{
		"id": 4,
		"identifier": "...whatever...",
		"name": "./assets/style.scss",
		"chunks": [0],
		"assets": [],
		"issuer": "...whatever...",
		"reasons": 
		[{
			"userRequest": "./assets/style.scss"
		}],
		"source": "module.exports = \"body {} \" + require(\"-!!/cryptic/path/&!./assets/child.scss\") + \" head {}\""
		//  + \" \" + require(\"original_module_name/style.scss\")
	},
	{
		"id": 5,
		"identifier": "...whatever...",
		"name": "./assets/child.scss",
		"chunks": [0],
		"assets": [],
		"issuer": "...whatever...",
		"reasons": 
		[{
			"userRequest": "-!!/cryptic/path/&!./assets/child.scss"
		}],
		"source": "module.exports = \".child { background: url(\" + __webpack_public_path__ + \"test.jpg) }\""
	},
	// {
	// 	"id": 6,
	// 	"identifier": "...whatever...",
	// 	"name": "/path/to/aliased_module_name/style.scss",
	// 	"chunks": [0],
	// 	"assets": [],
	// 	"issuer": "...whatever...",
	// 	"reasons": 
	// 	[{
	// 		"userRequest": "_original_module_name/style.scss"
	// 	}],
	// 	"source": "module.exports = \".aliased {}\""
	// },
	{
		"id": 101,
		"name": "./assets/test.text_parser_test",
		"reasons": 
		[{
			"userRequest": "./assets/test.text_parser_test"
		}],
		"source": "...whatever..."
	},
	{
		"id": 102,
		"name": "./assets/test.object_parser_test",
		"reasons": 
		[{
			"userRequest": "./assets/test.object_parser_test"
		}],
		"source": "...whatever..."
	}]
}