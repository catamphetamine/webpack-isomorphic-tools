# webpack-isomorphic-tools

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

<!---
[![Gratipay][gratipay-image]][gratipay-url]
-->

`webpack-isomorphic-tools` is a small helper module providing basic support for isomorphic (universal) rendering when using Webpack (this is an alternative solution to using Webpack's officially recommended `target: "node"` approach).

For an officially recommended Webpack's `target: "node"` approach see [`universal-webpack`](https://github.com/halt-hammerzeit/universal-webpack) library. `universal-webpack` library is the recommended way to go.

If for some reason `universal-webpack` doesn't suit your needs, or is too complex to grasp, then you can try using `webpack-isomorphic-tools`. `webpack-isomorphic-tools` are not affiliated with Webpack team in any way and provide support for basic use cases (no support for Webpack plugins, for example) aiming to be easy to understand for beginners.

*Small Advertisement:* 📞 if you're looking for a React phone number component check out [`react-phone-number-input`](http://halt-hammerzeit.github.io/react-phone-number-input/)

## Topics

- [What it does](#what-it-does)
- [A simple example](#a-simple-example)
- [Installation](#installation)
- [Usage](#usage)
- [A working example](#a-working-example)
- [Configuration](#configuration)
- [Configuration examples](#configuration-examples)
- [What are webpack-assets.json?](#what-are-webpack-assetsjson)
- [What are Webpack stats?](#what-are-webpack-stats)
- [What's a "module"?](#whats-a-module)
- [API](#api)
- [Troubleshooting](#troubleshooting)
- [Miscellaneous](#miscellaneous)
- [References](#references)
- [Contributing](#contributing)

## What it does

Suppose you have an application which is built using Webpack. It works in the web browser.

Should it be "isomorphic" ("universal")? It's better if it is. One reason is that search engines will be able to index your page. The other reason is that we live in a realtime mobile age which declared war on network latency, and so it's always better to fetch an already rendered content than to first fetch the application code and only then fetch the content to render the page. Every time you release a client-side only website to the internet someone writes a [frustrated blog post](https://ponyfoo.com/articles/stop-breaking-the-web).

So, it's obvious then that web applications should be "isomorphic" ("universal"), i.e. be able to render both on the client and the server, depending on circumstances. And it is perfectly possible nowadays since javascript runs everywhere: both in web browsers and on servers.

Ok, then one can just go ahead and run the web application in Node.js and its done. But, there's one gotcha: a Webpack application will usually crash when tried to be run in Node.js straight ahead (you'll get a lot of `SyntaxError`s with `Unexpected token`s).

The reason is that Webpack introduces its own layer above the standard javascript. This extra layer handles all `require()` calls magically resolving them to whatever it is configured to. For example, Webpack is perfectly fine with the code `require()`ing CSS styles or SVG images.

Bare Node.js obviously doesn't come with such trickery up its sleeve. Maybe it can be somehow enhanced to be able to do such things? Turned out that it can, and that's what `webpack-isomorphic-tools` do: they inject that `require()` magic layer above the standard javascript in Node.js.

An alternative solution exists now: to compile server-side code with Webpack the same way it already compiles the client-side code. This is the officially recommended way to go and one can use [`universal-webpack`](https://github.com/halt-hammerzeit/universal-webpack) library to achieve that. However, some people still prefer this (earlier) library, so it still exists.

`webpack-isomorphic-tools` mimics (to a certain extent) Webpack's `require()` magic when running application code on a Node.js server without Webpack. It basically fixes all those `require()`s of assets and makes them work instead of throwing `SyntaxError`s. It doesn't provide all the capabilities of Webpack (for example, plugins won't work), but for the basic stuff, it works.

## A simple example

For example, consider images. Images are `require()`d in React components and then used like this:

```javascript
// alternatively one can use `import`, 
// but with `import`s hot reloading won't work
// import image_path from '../image.png'

// Just `src` the image inside the `render()` method
class Photo extends React.Component
{
  render()
  {
    // When Webpack url-loader finds this `require()` call 
    // it will copy `image.png` to the build folder 
    // and name it something like `9059f094ddb49c2b0fa6a254a6ebf2ad.png`, 
    // because Webpack is set up to use the `[hash]` file naming feature
    // which makes browser asset caching work correctly.
    return <img src={ require('../image.png') }/>
  }
}
```

It works on the client-side because Webpack intelligently replaces all the `require()` calls with a bit of magic.
But it wouldn't work on the server-side because Node.js only knows how to `require()` javascript modules. It would just throw a `SyntaxError`.

To solve this issue one can use `webpack-isomorphic-tools`. With the help of `webpack-isomorphic-tools` in this particular case the `require()` call will return the real path to the image on the disk. It would be something like `../../build/9059f094ddb49c2b0fa6a254a6ebf2ad.png`. How did `webpack-isomorphic-tools` figure out this weird real file path? It's just a bit of magic.

`webpack-isomorphic-tools` is extensible, and finding the real paths for assets is the simplest example of what it can do inside `require()` calls. Using [custom configuration](#configuration) one can make `require()` calls (on the server) return anything (not just a String; it may be a JSON object, for example).

For example, if one is using Webpack [css-loader](https://github.com/webpack/css-loader) modules feature (also referred to as ["local styles"](https://medium.com/seek-ui-engineering/the-end-of-global-css-90d2a4a06284)) one can make `require(*.css)` calls return JSON objects with generated CSS class names maps like they do in [este](https://github.com/este/este/blob/master/webpack/assets.js) and [react-redux-universal-hot-example](https://github.com/erikras/react-redux-universal-hot-example#styles).

## Tutorials and blog posts

Just some basic guidance from other people on the internets

  * [Importing SVGs](https://github.com/peter-mouland/react-lego/wiki/Importing-SVGs) by [@peter-mouland](https://github.com/peter-mouland)

## Installation

`webpack-isomorphic-tools` are required both for development and production

```bash
$ npm install webpack-isomorphic-tools --save
```

## Usage

First you add `webpack_isomorphic_tools` plugin to your Webpack configuration.

### webpack.config.js

```javascript
var Webpack_isomorphic_tools_plugin = require('webpack-isomorphic-tools/plugin')

var webpack_isomorphic_tools_plugin = 
  // webpack-isomorphic-tools settings reside in a separate .js file 
  // (because they will be used in the web server code too).
  new Webpack_isomorphic_tools_plugin(require('./webpack-isomorphic-tools-configuration'))
  // also enter development mode since it's a development webpack configuration
  // (see below for explanation)
  .development()

// usual Webpack configuration
module.exports =
{
  context: '(required) your project path here',

  module:
  {
    loaders:
    [
      ...,
      {
        test: webpack_isomorphic_tools_plugin.regular_expression('images'),
        loader: 'url-loader?limit=10240', // any image below or equal to 10K will be converted to inline base64 instead
      }
    ]
  },

  plugins:
  [
    ...,

    webpack_isomorphic_tools_plugin
  ]

  ...
}
```

What does `.development()` method do? It enables development mode. In short, when in development mode, it disables asset caching (and enables asset hot reload), and optionally runs its own "dev server" utility (see `port` configuration setting). Call it in development webpack build configuration, and, conversely, don't call it in production webpack build configuration.

For each asset type managed by `webpack_isomorphic_tools` there should be a corresponding loader in your Webpack configuration. For this reason `webpack_isomorphic_tools/plugin` provides a `.regular_expression(asset_type)` method. The `asset_type` parameter is taken from your `webpack-isomorphic-tools` configuration:

### webpack-isomorphic-tools-configuration.js

```javascript
import Webpack_isomorphic_tools_plugin from 'webpack-isomorphic-tools/plugin'

export default
{
  assets:
  {
    images:
    {
      extensions: ['png', 'jpg', 'gif', 'ico', 'svg']
    }
  }
}
```

That's it for the client side. Next, the server side. You create your server side instance of `webpack-isomorphic-tools` in the very main server javascript file (and your web application code will reside in some `server.js` file which is `require()`d in the bottom)

### main.js

```javascript
var Webpack_isomorphic_tools = require('webpack-isomorphic-tools')

// this must be equal to your Webpack configuration "context" parameter
var project_base_path = require('path').resolve(__dirname, '..')

// this global variable will be used later in express middleware
global.webpack_isomorphic_tools = new Webpack_isomorphic_tools(require('./webpack-isomorphic-tools-configuration'))
// initializes a server-side instance of webpack-isomorphic-tools
// (the first parameter is the base path for your project
//  and is equal to the "context" parameter of you Webpack configuration)
// (if you prefer Promises over callbacks 
//  you can omit the callback parameter
//  and then it will return a Promise instead)
.server(project_base_path, function()
{
  // webpack-isomorphic-tools is all set now.
  // here goes all your web application code:
  // (it must reside in a separate *.js file 
  //  in order for the whole thing to work)
  require('./server')
})
```

Then you, for example, create an express middleware to render your pages on the server

```javascript
import React from 'react'

// html page markup
import Html from './html'

// will be used in express_application.use(...)
export function page_rendering_middleware(request, response)
{
  // clear require() cache if in development mode
  // (makes asset hot reloading work)
  if (_development_)
  {
    webpack_isomorphic_tools.refresh()
  }

  // for react-router example of determining current page by URL take a look at this:
  // https://github.com/halt-hammerzeit/webapp/blob/master/code/server/webpage%20rendering.js
  const page_component = [determine your page component here using request.path]

  // for a Redux Flux store implementation you can see the same example:
  // https://github.com/halt-hammerzeit/webapp/blob/master/code/server/webpage%20rendering.js
  const flux_store = [initialize and populate your flux store depending on the page being shown]

  // render the page to string and send it to the browser as text/html
  response.send('<!doctype html>\n' +
        React.renderToString(<Html assets={webpack_isomorphic_tools.assets()} component={page_component} store={flux_store}/>))
}
```

And finally you use the `assets` inside the `Html` component's `render()` method

```javascript
import React, {Component, PropTypes} from 'react'
import serialize from 'serialize-javascript'

export default class Html extends Component
{
  static propTypes =
  {
    assets    : PropTypes.object,
    component : PropTypes.object,
    store     : PropTypes.object
  }

  // a sidenote for "advanced" users:
  // (you may skip this)
  //
  // this file is usually not included in your Webpack build
  // because this React component is only needed for server side React rendering.
  //
  // so, if this React component is not `require()`d from anywhere in your client code,
  // then Webpack won't ever get here 
  // which means Webpack won't detect and parse any of the `require()` calls here,
  // which in turn means that if you `require()` any unique assets here 
  // you should also `require()` those assets somewhere in your client code,
  // otherwise those assets won't be present in your Webpack bundle and won't be found.
  //
  render()
  {
    const { assets, component, store } = this.props

    // "import" will work here too 
    // but if you want hot reloading to work while developing your project
    // then you need to use require()
    // because import will only be executed a single time 
    // (when the application launches)
    // you can refer to the "Require() vs import" section for more explanation
    const picture = require('../assets/images/cat.jpg')

    // favicon
    const icon = require('../assets/images/icon/32x32.png')

    const html = 
    (
      <html lang="en-us">
        <head>
          <meta charSet="utf-8"/>
          <title>xHamster</title>

          {/* favicon */}
          <link rel="shortcut icon" href={icon} />

          {/* styles (will be present only in production with webpack extract text plugin) */}
          {Object.keys(assets.styles).map((style, i) =>
            <link href={assets.styles[style]} key={i} media="screen, projection"
                  rel="stylesheet" type="text/css"/>)}

          {/* resolves the initial style flash (flicker) on page load in development mode */}
          { Object.keys(assets.styles).is_empty() ? <style dangerouslySetInnerHTML={{__html: require('../assets/styles/main_style.css')}}/> : null }
        </head>

        <body>
          {/* image requiring demonstration */}
          <img src={picture}/>

          {/* rendered React page */}
          <div id="content" dangerouslySetInnerHTML={{__html: React.renderToString(component)}}/>

          {/* Flux store data will be reloaded into the store on the client */}
          <script dangerouslySetInnerHTML={{__html: `window._flux_store_data=${serialize(store.getState())};`}} />

          {/* javascripts */}
          {/* (usually one for each "entry" in webpack configuration) */}
          {/* (for more informations on "entries" see https://github.com/petehunt/webpack-howto/) */}
          {Object.keys(assets.javascript).map((script, i) =>
            <script src={assets.javascript[script]} key={i}/>
          )}
        </body>
      </html>
    )

    return html
  }
}
```

`assets` in the code above are simply the contents of `webpack-assets.json` which is created by `webpack-isomorphic-tools` in your project base folder. `webpack-assets.json` (in the simplest case) keeps track of the real paths to your assets, e.g.

```javascript
{
  "javascript":
  {
    "main": "/assets/main-d8c29e9b2a4623f696e8.js"
  },

  "styles":
  {
    "main": "/assets/main-d8c29e9b2a4623f696e8.css"
  },

  "assets":
  {
    "./assets/images/cat.jpg": "http://localhost:3001/assets/9059f094ddb49c2b0fa6a254a6ebf2ad.jpg",
    
    "./assets/images/icon/32x32.png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAQAAADZc7J/AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQffBhcWAg6gFw6bAAAB60lEQVRIx+3UTUjUQRzG8c+u/n2BDe3lIJtQSuYhsPTQG+TFYLulguStoA5dPHYogoKigoi8dIsOCd0iiC4JFYFQBAVZEUgklWVQqam4vu1uF111d1310qWe0/yemfnyzPyG4b8KllQl6jWqNuX3nFNun/0qjJpYGRB1TkyRWu0C76Q0uKhOkT1aDfqSP0uxTpetR1i9e2Iq3HVUCQKt7tuWP0GDmDOGkfJd3GEbhFwzg6T3alR5lg0Ip0fVPhhKV2+UqfNcMu28sjlXggVAXEQoXZVKmlC2aGXETH5Ary3q026zPg8dtGnOKXPIi/x3MCJwUtyUqBN2uarXTi1+Cql1yqibuTKElsCaHBFBn1v6sU67RoGkHl3GciVYDNiuWVSphDEJYaSkRBSbNqLHI7PZgML0qNIFrz3OwqZAuQ6BB8KqRL01nA3YbdCVRW3L1KxGTx1zQMI3p01nAkqN5NnOkBrXJZw1qlOlj5mAlTQuqluXcRGTSrOPsJJeajOQzphaOyDucy47vGrAMvqLgCLlS97HmgH17mgRzFWhbEAq43/M1EYF2p1XoVAgMW8vdKFfmx0+LbO9WJNut3W44Ze4r/MTC6cKHBczutDhJSrxwyWDAntt9cRANoCwqLKcgJApAyZXfV//mP4AWg969geZ6qgAAAAldEVYdGRhdGU6Y3JlYXRlADIwMTUtMDYtMjNUMjI6MDI6MTQrMDI6MDBG88r0AAAAJXRFWHRkYXRlOm1vZGlmeQAyMDE1LTA2LTIzVDIyOjAyOjE0KzAyOjAwN65ySAAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAAASUVORK5CYII="
  }
}
```

And that's it, now you can `require()` your assets "isomorphically" (both on client and server).

## A working example

`webpack-isomorphic-tools` are featured in [react-redux-universal-hot-example](https://github.com/erikras/react-redux-universal-hot-example/blob/master/webpack/webpack-isomorphic-tools.js#L64-L96). There it is used to `require()` images and CSS styles (in the form of CSS `modules`).

Also you may look at [this sample project](https://github.com/halt-hammerzeit/webapp). There it is used to `require()` images and CSS styles (without using CSS `modules` feature).

Some source code guidance for the aforementioned project:

* [webpack-isomorphic-tools configuration](https://github.com/halt-hammerzeit/webapp/blob/master/frontend/webpack/webpack-isomorphic-tools.js)
* [webpack-isomorphic-tools plugin](https://github.com/halt-hammerzeit/webapp/blob/master/frontend/webpack/development%20server.js#L57)
* [webpack-isomorphic-tools server-side initialization](https://github.com/halt-hammerzeit/webapp/blob/master/frontend/page-server/entry.es6.js#L13-L18)

## Configuration

Available configuration parameters:

```javascript
{
  // debug mode.
  // when set to true, lets you see debugging messages in the console.
  //
  debug: true, // is false by default

  // (optional)
  // (recommended)
  //
  // when `port` is set, then this `port` is used
  // to run an HTTP server serving Webpack assets.
  // (`express` npm package must be installed in order for this to work)
  //
  // this way, in development mode, `webpack-assets.json` won't ever
  // be written to disk and instead will always reside in memory
  // and be served from memory (just as `webpack-dev-server` does).
  //
  // this `port` setting will take effect only in development mode.
  //
  // port: 8888, // is false by default

  // verbosity.
  //
  // when set to 'no webpack stats',
  // outputs no Webpack stats to the console in development mode.
  // this also means no Webpack errors or warnings will be output to the console.
  //
  // when set to 'webpack stats for each build',
  // outputs Webpack stats to the console 
  // in development mode on each incremental build.
  // (i guess no one is gonna ever use this setting)
  //
  // when not set (default), outputs Webpack stats to the console 
  // in development mode for the first build only.
  //
  // verbosity: ..., // is `undefined` by default

  // enables support for `require.context()` and `require.ensure()` functions.
  // is turned off by default 
  // to skip unnecessary code instrumentation
  // because not everyone uses it.
  //
  // patch_require: true, // is false by default

  // By default it creates 'webpack-assets.json' file at 
  // webpack_configuration.context (which is your project folder).
  // You can change the assets file path as you wish
  // (therefore changing both folder and filename).
  //
  // (relative to webpack_configuration.context which is your project folder)
  //
  webpack_assets_file_path: 'webpack-assets.json',

  // By default, when running in debug mode, it creates 'webpack-stats.json' file at 
  // webpack_configuration.context (which is your project folder).
  // You can change the stats file path as you wish
  // (therefore changing both folder and filename).
  //
  // (relative to webpack_configuration.context which is your project folder)
  //
  webpack_stats_file_path: 'webpack-stats.json',

  // Makes `webpack-isomorphic-tools` aware of Webpack aliasing feature
  // (if you use it)
  // https://webpack.github.io/docs/resolving.html#aliasing
  //
  // The `alias` parameter corresponds to `resolve.alias` 
  // in your Webpack configuration.
  //
  alias: webpack_configuration.resolve.alias, // is {} by default

  // if you're using Webpack's `resolve.modulesDirectories`
  // then you should also put them here.
  //
  // modulesDirectories: webpack_configuration.resolve.modulesDirectories // is ['node_modules'] by default

  // here you can define all your asset types
  //
  assets:
  {
    // keys of this object will appear in:
    //  * webpack-assets.json
    //  * .assets() method call result
    //  * .regular_expression(key) method call
    //
    png_images: 
    {
      // which file types belong to this asset type
      //
      extension: 'png', // or extensions: ['png', 'jpg', ...],

      // [optional]
      // 
      // here you are able to add some file paths 
      // for which the require() call will bypass webpack-isomorphic-tools
      // (relative to the project base folder, e.g. ./sources/server/kitten.jpg.js)
      // (also supports regular expressions, e.g. /^\.\/node_modules\/*/, 
      //  and functions(path) { return true / false })
      //
      // exclude: [],

      // [optional]
      // 
      // here you can specify manually the paths 
      // for which the require() call will be processed by webpack-isomorphic-tools
      // (relative to the project base folder, e.g. ./sources/server/kitten.jpg.js)
      // (also supports regular expressions, e.g. /^\.\/node_modules\/*/, 
      //  and functions(path) { return true / false }).
      // in case of `include` only included paths will be processed by webpack-isomorphic-tools.
      //
      // include: [],

      // [optional]
      // 
      // determines which webpack stats modules 
      // belong to this asset type
      //
      // arguments:
      //
      //  module             - a webpack stats module
      //
      //                       (to understand what a "module" is
      //                        read the "What's a "module"?" section of this readme)
      //
      //  regular_expression - a regular expression 
      //                       composed of this asset type's extensions
      //                       e.g. /\.scss$/, /\.(ico|gif)$/
      //
      //  options            - various options
      //                       (development mode flag,
      //                        debug mode flag,
      //                        assets base url,
      //                        project base folder,
      //                        regular_expressions{} for each asset type (by name),
      //                        webpack stats json object)
      //
      //  log
      // 
      // returns: a Boolean
      //
      // by default is: "return regular_expression.test(module.name)"
      //
      // premade utility filters:
      //
      // Webpack_isomorphic_tools_plugin.style_loader_filter
      //  (for use with style-loader + css-loader)
      //
      filter: function(module, regular_expression, options, log)
      {
        return regular_expression.test(module.name)
      },

      // [optional]
      //
      // transforms a webpack stats module name 
      // to an asset path (usually is the same thing)
      //
      // arguments:
      //
      //  module  - a webpack stats module
      //
      //            (to understand what a "module" is
      //             read the "What's a "module"?" section of this readme)
      //
      //  options - various options
      //            (development mode flag,
      //             debug mode flag,
      //             assets base url,
      //             project base folder,
      //             regular_expressions{} for each asset type (by name),
      //             webpack stats json object)
      //
      //  log
      // 
      // returns: a String
      //
      // by default is: "return module.name"
      //
      // premade utility path extractors:
      //
      // Webpack_isomorphic_tools_plugin.style_loader_path_extractor
      //  (for use with style-loader + css-loader)
      //
      path: function(module, options, log)
      {
        return module.name
      },

      // [optional]
      // 
      // parses a webpack stats module object
      // for an asset of this asset type
      // to whatever you need to get 
      // when you require() these assets 
      // in your code later on.
      //
      // this is what you'll see as the asset value in webpack-assets.json: 
      // { ..., path(): compile(parser()), ... }
      //
      // can be a CommonJS module source code:
      // module.exports = ...what you export here is 
      //                     what you get when you require() this asset...
      //
      // if the returned value is not a CommonJS module source code
      // (it may be a string, a JSON object, whatever) 
      // then it will be transformed into a CommonJS module source code.
      //
      // in other words: 
      //
      // // making of webpack-assets.json
      // for each type of configuration.assets
      //   modules.filter(type.filter).for_each (module)
      //     assets[type.path()] = compile(type.parser(module))
      //
      // // requiring assets in your code
      // require(path) = (path) => return assets[path]
      //
      // arguments:
      //
      //  module  - a webpack stats module
      //
      //            (to understand what a "module" is
      //             read the "What's a "module"?" section of this readme)
      //
      //  options - various options
      //            (development mode flag,
      //             debug mode flag,
      //             assets base url,
      //             project base folder,
      //             regular_expressions{} for each asset type (by name),
      //             webpack stats json object)
      //
      //  log
      // 
      // returns: whatever (could be a filename, could be a JSON object, etc)
      //
      // by default is: "return module.source"
      //
      // premade utility parsers:
      //
      // Webpack_isomorphic_tools_plugin.url_loader_parser
      //  (for use with url-loader or file-loader)
      //  require() will return file URL
      //  (is equal to the default parser, i.e. no parser)
      //
      // Webpack_isomorphic_tools_plugin.css_loader_parser
      //  (for use with css-loader when not using "modules" feature)
      //  require() will return CSS style text
      //
      // Webpack_isomorphic_tools_plugin.css_modules_loader_parser
      //  (for use with css-loader when using "modules" feature)
      //  require() will return a JSON object map of style class names
      //  which will also have a `_style` key containing CSS style text
      //
      parser: function(module, options, log)
      {
        log.info('# module name', module.name)
        log.info('# module source', module.source)
        log.info('# project path', options.project_path)
        log.info('# assets base url', options.assets_base_url)
        log.info('# regular expressions', options.regular_expressions)
        log.info('# debug mode', options.debug)
        log.info('# development mode', options.development)
        log.debug('debugging')
        log.warning('warning')
        log.error('error')
      }
    },
    ...
  },
  ...]
}
```

## Configuration examples

#### url-loader / file-loader (images, fonts, etc)

`url-loader` and `file-loader` are supported with no additional configuration

```javascript
{
  assets:
  {
    images:
    {
      extensions: ['png', 'jpg']
    },

    fonts:
    {
      extensions: ['woff', 'ttf']
    }
  }
}
```

#### style-loader (standard CSS stylesheets)

If you aren't using "CSS modules" feature of Webpack, and if in your production Webpack config you use `ExtractTextPlugin` for CSS styles, then you can set it up like this

```javascript
{
  assets:
  {
    styles:
    {
      extensions: ['less', 'scss'],

      // which `module`s to parse CSS from:
      filter: function(module, regular_expression, options, log)
      {
        if (options.development)
        {
          // In development mode there's Webpack "style-loader",
          // which outputs `module`s with `module.name == asset_path`,
          // but those `module`s do not contain CSS text.
          //
          // The `module`s containing CSS text are 
          // the ones loaded with Webpack "css-loader".
          // (which have kinda weird `module.name`)
          //
          // Therefore using a non-default `filter` function here.
          //
          return webpack_isomorphic_tools_plugin.style_loader_filter(module, regular_expression, options, log)
        }

        // In production mode there will be no CSS text at all
        // because all styles will be extracted by Webpack Extract Text Plugin
        // into a .css file (as per Webpack configuration).
        //
        // Therefore in production mode `filter` function always returns non-`true`.
      },

      // How to correctly transform kinda weird `module.name`
      // of the `module` created by Webpack "css-loader" 
      // into the correct asset path:
      path: webpack_isomorphic_tools_plugin.style_loader_path_extractor,

      // How to extract these Webpack `module`s' javascript `source` code.
      // basically takes `module.source` and modifies `module.exports` a little.
      parser: webpack_isomorphic_tools_plugin.css_loader_parser
    }
  }
}
```

#### style-loader (CSS stylesheets with "CSS modules" feature)

If you are using "CSS modules" feature of Webpack, and if in your production Webpack config you use `ExtractTextPlugin` for CSS styles, then you can set it up like this

```javascript
{
  assets:
  {
    style_modules:
    {
      extensions: ['less', 'scss'],

      // which `module`s to parse CSS style class name maps from:
      filter: function(module, regex, options, log)
      {
        if (options.development)
        {
          // In development mode there's Webpack "style-loader",
          // which outputs `module`s with `module.name == asset_path`,
          // but those `module`s do not contain CSS text.
          //
          // The `module`s containing CSS text are 
          // the ones loaded with Webpack "css-loader".
          // (which have kinda weird `module.name`)
          //
          // Therefore using a non-default `filter` function here.
          //
          return webpack_isomorphic_tools_plugin.style_loader_filter(module, regex, options, log)
        }

        // In production mode there's no Webpack "style-loader",
        // so `module.name`s of the `module`s created by Webpack "css-loader"
        // (those which contain CSS text)
        // will be simply equal to the correct asset path
        return regex.test(module.name)
      },

      // How to correctly transform `module.name`s
      // into correct asset paths
      path: function(module, options, log)
      {
        if (options.development)
        {
          // In development mode there's Webpack "style-loader",
          // so `module.name`s of the `module`s created by Webpack "css-loader"
          // (those picked by the `filter` function above)
          // will be kinda weird, and this path extractor extracts 
          // the correct asset paths from these kinda weird `module.name`s
          return WebpackIsomorphicToolsPlugin.style_loader_path_extractor(module, options, log);
        }

        // in production mode there's no Webpack "style-loader",
        // so `module.name`s will be equal to correct asset paths
        return module.name
      },

      // How to extract these Webpack `module`s' javascript `source` code.
      // Basically takes `module.source` and modifies its `module.exports` a little.
      parser: function(module, options, log)
      {
        if (options.development)
        {
          // In development mode it adds an extra `_style` entry
          // to the CSS style class name map, containing the CSS text
          return WebpackIsomorphicToolsPlugin.css_modules_loader_parser(module, options, log);
        }

        // In production mode there's Webpack Extract Text Plugin 
        // which extracts all CSS text away, so there's
        // only CSS style class name map left.
        return module.source
      }
    }
  }
}
```

## What are webpack-assets.json?

This file is needed for `webpack-isomorphic-tools` operation on server. It is created by a custom Webpack plugin and is then read from the filesystem by `webpack-isomorphic-tools` server instance. When you `require(path_to_an_asset)` an asset on server then what you get is simply what's there in this file corresponding to this `path_to_an_asset` key (under the `assets` section).

Pseudocode: 

```
// requiring assets in your code
require(path) = (path) => return assets[path]
```

Therefore, if you get such a message in the console:

```
[webpack-isomorphic-tools] [error] asset not found: ./~/react-toolbox/lib/font_icon/style.scss
```

Then it means that the asset you requested (`require()`d) is absent from your `webpack-assets.json` which in turn means that you haven't placed this asset to your `webpack-assets.json` in the first place. How to place an asset into `webpack-assets.json`?

Pseudocode: 

```
// making of webpack-assets.json inside the Webpack plugin
for each type of configuration.assets
  modules.filter(type.filter).for_each (module)
    assets[type.path()] = compile(type.parser(module))
```

Therefore, if you get the "asset not found" error, first check your `webpack-assets.json` and second check your `webpack-isomorphic-tools` configuration section for this asset type: are your `filter`, `path` and `parser` functions correct?

## What are Webpack stats?

[Webpack stats](https://github.com/webpack/docs/wiki/node.js-api#stats) are a description of all the modules in a Webpack build. When running in debug mode Webpack stats are output to a file named `webpack-stats.json` in the same folder as your `webpack-assets.json` file. One may be interested in the contents of this file when writing custom `filter`, `path` or `parser` functions. This file is not needed for operation, it's just some debugging information.

## What's a "module"?

**This is an advanced topic on Webpack internals**

A "module" is a Webpack entity. One of the main features of Webpack is code splitting. When Webpack builds your code it splits it into "chunks" - large portions of code which can be downloaded separately later on (if needed) therefore reducing the initial page load time for your website visitor. These big "chunks" aren't monolithic and in their turn are composed of "modules" which are: standard CommonJS javascript modules you `require()` every day, pictures, stylesheets, etc. Every time you `require()` something (it could be anything: an npm module, a javascript file, or a css style, or an image) a `module` entry is created by Webpack. And the file where this `require()` call originated is called a `reason` for this `require()`d `module`. Each `module` entry has a `name` and a `source` code, along with a list of `chunks` it's in and a bunch of other miscellaneous irrelevant properties.

For example, here's a piece of an example `webpack-stats.json` file (which is generated along with `webpack-assets.json` in debug mode). Here you can see a random `module` entry created by Webpack.

```javascript
{
  ...

  "modules": [
    {
      "id": 0,
      ...
    },
    {
      "id": 1,
      "name": "./~/fbjs/lib/invariant.js",
      "source": "module.exports = global[\"undefined\"] = require(\"-!G:\\\\work\\\\isomorphic-demo\\\\node_modules\\\\fbjs\\\\lib\\\\invariant.js\");",

      // the rest of the fields are irrelevant

      "chunks": [
        0
      ],
      "identifier": "G:\\work\\isomorphic-demo\\node_modules\\expose-loader\\index.js?undefined!G:\\work\\isomorphic-demo\\node_modules\\fbjs\\lib\\invariant.js",
      "index": 27,
      "index2": 7,
      "size": 117,
      "cacheable": true,
      "built": true,
      "optional": false,
      "prefetched": false,
      "assets": [],
      "issuer": "G:\\work\\isomorphic-demo\\node_modules\\react\\lib\\ReactInstanceHandles.js",
      "failed": false,
      "errors": 0,
      "warnings": 0,

      "reasons": [
        {
          "moduleId": 418,
          "moduleIdentifier": "G:\\work\\isomorphic-demo\\node_modules\\react\\lib\\ReactInstanceHandles.js",
          "module": "./~/react/lib/ReactInstanceHandles.js",
          "moduleName": "./~/react/lib/ReactInstanceHandles.js",
          "type": "cjs require",
          "userRequest": "fbjs/lib/invariant",
          "loc": "17:16-45"
        },
        ...
        {
          "moduleId": 483,
          "moduleIdentifier": "G:\\work\\isomorphic-demo\\node_modules\\react\\lib\\traverseAllChildren.js",
          "module": "./~/react/lib/traverseAllChildren.js",
          "moduleName": "./~/react/lib/traverseAllChildren.js",
          "type": "cjs require",
          "userRequest": "fbjs/lib/invariant",
          "loc": "19:16-45"
        }
      ]
    },

    ...
  ]
}
```

Judging by its `reasons` and their `userRequest`s one can deduce that this `module` is `require()`d by many other `module`s in this project and the code triggering this `module` entry creation could look something like this

```javascript
var invariant = require('fbjs/lib/invariant')
```

Every time you `require()` anything in your code, Webpack detects it during build process and the `require()`d `module` is "loaded" (decorated, transformed, replaced, etc) by a corresponding module "loader" (or loaders) specified in Webpack configuration file (`webpack.conf.js`) under the "module.loaders" path. For example, say, all JPG images in a project are configured to be loaded with a "url-loader":

```javascript
// Webpack configuration
module.exports =
{
  ...

  module:
  {
    loaders:
    [
      ...

      {
        test   : /\.jpg$/,
        loader : 'url-loader'
      }
    ]
  },

  ...
}
```

This works on client: `require()` calls will return URLs for JPG images. The next step is to make `require()` calls to these JPG images behave the same way when this code is run on the server, with the help of `webpack-isomorphic-tools`. So, the fields of interest of the `module` object would be `name` and `source`: first you find the modules of interest by their `name`s (in this case, the module `name`s would end in ".jpg") and then you parse the `source`s of those modules to extract the information you need (in this case that would be the real path to an image).

The `module` object for an image would look like this

```javascript
{
  ...
  "name": "./assets/images/husky.jpg",
  "source": "module.exports = __webpack_public_path__ + \"9059f094ddb49c2b0fa6a254a6ebf2ad.jpg\""
}
```

Therefore, in this simple case, in `webpack-isomorphic-tools` configuration file we create an "images" asset type with extension "jpg" and these parameters:

* the `filter` function would be `module => module.name.ends_with('.jpg')` (and it's the default `filter` if no `filter` is specified)
* the `path` parser function would be `module => module.name` (and it's the default `path` parser if no `path` parser is specified)
* the `parser` function would be `module => module.source` (and it's the default `parser` if no `parser` is specified)

When the javascript `source` code returned by this `parser` function gets compiled by `webpack-isomorphic-tools` it will yeild a valid CommonJS javascript module which will return the URL for this image, resulting in the following piece of `webpack-assets.json`:

```
{
  ...
  assets:
  {
     "./assets/images/husky.jpg": "/assets/9059f094ddb49c2b0fa6a254a6ebf2ad.jpg",
     ...
  }
}
```

And so when you later `require("./assets/images/husky.jpg")` in your server code it will return `"/assets/9059f094ddb49c2b0fa6a254a6ebf2ad.jpg"` and that's it.

## API

> Note : All exported functions and public methods have camelCase aliases

#### Constructor

(both Webpack plugin and server tools)

Takes an object with options (see [Configuration](#configuration) section above)

#### `process.env.NODE_ENV`

(server tools instance only)

`process.env.NODE_ENV` variable is examined to determine if it's production mode or development mode. Any value for `process.env.NODE_ENV` other than `production` will indicate development mode.

For example, in development mode, assets aren't cached, and therefore support hot reloading (if anyone would ever need that). Also `development` variable is passed to asset type's `filter`, `path` and `parser` functions.

The prevously available `.development()` method for the server-side instance is now deprecated and has no effect.

#### .development(true or false, or undefined -> true)

(Webpack plugin instance only)

Is it development mode or is it production mode? By default it's production mode. But if you're instantiating `webpack-isomorphic-tools/plugin` for use in Webpack development configuration, then you should call this method to enable asset hot reloading (and disable asset caching), and optinally to run its own "dev server" utility (see `port` configuration setting). It should be called right after the constructor.

#### .regular_expression(asset_type)

(aka `.regexp(asset_type)`)

(Webpack plugin instance)

Returns the regular expression for this asset type (based on this asset type's `extension` (or `extensions`))

#### Webpack_isomorphic_tools_plugin.url_loader_parser

(Webpack plugin)

A parser (see [Configuration](#configuration) section above) for Webpack [url-loader](https://github.com/webpack/url-loader), also works for Webpack [file-loader](https://github.com/webpack/file-loader). Use it for your images, fonts, etc.

#### .server(project_path, [callback])

(server tools instance)

Initializes a server-side instance of `webpack-isomorphic-tools` with the base path for your project and makes all the server-side `require()` calls work. The `project_path` parameter must be identical to the `context` parameter of your Webpack configuration and is needed to locate `webpack-assets.json` (contains the assets info) which is output by Webpack process.

When you're running your project in development mode for the very first time the `webpack-assets.json` file doesn't exist yet because in development mode `webpack-dev-server` and your application server are run concurrently and by the time the application server starts the `webpack-assets.json` file hasn't yet been generated by Webpack and `require()` calls for your assets would return `undefined`.

To fix this you can put your application server code into a `callback` and pass it as a second parameter and it will be called as soon as `webpack-assets.json` file is detected. If not given a `callback` this method will return a `Promise` which is fulfilled as soon as `webpack-assets.json` file is detected (in case you prefer `Promise`s over `callback`s). When choosing a `Promise` way you won't be able to get the `webpack-isomorphic-tools` instance variable reference out of the `.server()` method call result, so your code can be a bit more verbose in this case.

#### .refresh()

(server tools instance)

Refreshes your assets info (re-reads `webpack-assets.json` from disk) and also flushes cache for all the previously `require()`d assets

#### .assets()

(server tools instance)

Returns the contents of `webpack-assets.json` which is created by `webpack-isomorphic-tools` in your project base folder

## Troubleshooting

### Cannot find module

If encountered when run on server, this error means that the `require()`d path doesn't exist in the filesystem (all the `require()`d assets [must exist in the filesystem](https://github.com/nodejs/node/blob/4d4cfb27ca7718c7df381ac3b257175927cd17d1/lib/module.js#L436-L441) when run on server). If encountered during Webpack build, this error means that the `require()`d path is absent from `webpack-stats.json`.

As an illustration, consider an example where a developer transpiles all his ES6 code using Babel into a single compiled file `./build/server-bundle-es5.js`. Because all the assets still remain in the `./src` directory, `Cannot find module` error will be thrown when trying to run the compiled bundle. As a workaround use [`babel-register`](https://babeljs.io/docs/usage/require/) instead. Or [copy all assets](https://github.com/halt-hammerzeit/webpack-isomorphic-tools/pull/68#issuecomment-218698675) to the `./build` folder (keeping the file tree structure) and point Webpack `context` to the `./src` folder.

### SyntaxError: Unexpected token ILLEGAL

This probably means that in some asset module source there's a `require()` call to some file extension that isn't specified in 

### "TypeError: require.context is not a function" or "TypeError: require.ensure is not a function"

You should enable `patch_require: true` flag in your `webpack-isomorphic-tools` configuration file. The reason is that the support for `require.context()` and `require.ensure()` [is hacky at the moment](https://github.com/halt-hammerzeit/webpack-isomorphic-tools/issues/48#issuecomment-182878437). It works and does its thing but the solution is not elegant enough if you know what I mean.

### Infinite "(waiting for the first Webpack build to finish)"

If you're getting this message infinitely then it means that `webpack-assets.json` is never generated by Webpack.

It can happen, for example, in any of these cases

  * you forgot to add `webpack-isomorphic-tools` plugin to your Webpack configuration
  * you aren't running your Webpack build either in parallel with your app or prior to running you app
  * you're using `webpack-dev-middleware` inside your main server code [which you shouldn't](https://github.com/halt-hammerzeit/webpack-isomorphic-tools/issues/47)
  * your Webpack configuration's `context` path doesn't point to the project base directory

If none of those is your case, enable `debug: true` flag in `webpack-isomorphic-tools` configuration to get debugging info.

## Miscellaneous

### Webpack 2 `System.import`

Instead of implementing `System.import` in this library I think that it would be more rational to use existing tools for transforming `System.import()` calls into `require()` calls. See [this stackoverflow answer](http://stackoverflow.com/questions/37121442/server-side-react-with-webpack-2-system-import/39088208#39088208) for a list of such tools.

### .gitignore

Make sure you add this to your `.gitignore` so that you don't commit these unnecessary files to your repo

```
# webpack-isomorphic-tools
/webpack-stats.json
/webpack-assets.json
```

### Require() vs import

In the image requiring examples above we could have wrote it like this:

```
import picture from './cat.jpg'
```

That would surely work. Much simpler and more modern. But, the disadvantage of the new ES6 module `import`ing is that by design it's static as opposed to dynamic nature of `require()`. Such a design decision was done on purpose and it's surely the right one:

* it's static so it can be optimized by the compiler and you don't need to know which module depends on which and manually reorder them in the right order because the compiler does it for you
* it's smart enough to resolve cyclic dependencies
* it can load modules both synchronously and asynchronously if it wants to and you'll never know because it can do it all by itself behind the scenes without your supervision
* the `export`s are static which means that your IDE can know exactly what each module is gonna export without compiling the code (and therefore it can autocomplete names, detect syntax errors, check types, etc); the compiler too has some benefits such as improved lookup speed and syntax and type checking
* it's simple, it's transparent, it's sane

If you wrote your code with just `import`s it would work fine. But imagine you're developing your website, so you're changing files constantly, and you would like it all refresh automagically when you reload your webpage (in development mode). `webpack-isomorphic-tools` gives you that. Remember this code in the express middleware example above?

```javascript
if (_development_)
{
  webpack_isomorphic_tools.refresh()
}
```

It does exactly as it says: it refreshes everything on page reload when you're in development mode. And to leverage this feature you need to use dynamic module loading as opposed to static one through `import`s. This can be done by `require()`ing your assets, and not at the top of the file where all `require()`s usually go but, say, inside the `render()` method for React components.

I also read on the internets that ES6 supports dynamic module loading too and it looks something like this:

```javascript
System.import('some_module')
.then(some_module =>
{
  // Use some_module
})
.catch(error =>
{
  ...
})
```

I'm currently unfamiliar with ES6 dynamic module loading system because I didn't research this question. Anyway it's still a draft specification so I guess good old `require()` is just fine to the time being.

Also it's good to know that the way all this `require('./asset.whatever_extension')` magic is based on [Node.js require hooks](http://bahmutov.calepin.co/hooking-into-node-loader-for-fun-and-profit.html) and it works with `import`s only when your ES6 code is transpiled by Babel which simply replaces all the `import`s with `require()`s. For now, everyone out there uses Babel, both on client and server. But when the time comes for ES6 to be widely natively adopted, and when a good enough ES6 module loading specification is released, then I (or someone else) will port this "require hook" to ES6 to work with `import`s.

## References

Initially based on the code from [react-redux-universal-hot-example](https://github.com/erikras/react-redux-universal-hot-example) by Erik Rasmussen

Also the same codebase (as in the project mentioned above) can be found in [isomorphic500](https://github.com/gpbl/isomorphic500) by Giampaolo Bellavite

Also uses `require()` hooking techniques from [node-hook](https://github.com/bahmutov/node-hook) by Gleb Bahmutov

## Contributing

After cloning this repo, ensure dependencies are installed by running:

```sh
npm install
```

This module is written in ES6 and uses [Babel](http://babeljs.io/) for ES5
transpilation. Widely consumable JavaScript can be produced by running:

```sh
npm run build
```

Once `npm run build` has run, you may `import` or `require()` directly from
node.

After developing, the full test suite can be evaluated by running:

```sh
npm test
```

When you're ready to test your new functionality on a real project, you can run

```sh
npm pack
```

It will `build`, `test` and then create a `.tgz` archive which you can then install in your project folder

```sh
npm install [module name with version].tar.gz
```

## To do

 * Implement `require.context(folder, include_subdirectories, regular_expression)` and `require.ensure` Webpack helper functions [properly](https://github.com/halt-hammerzeit/webpack-isomorphic-tools/issues/48#issuecomment-182878437)
 * Proper testing for `log` (output to a variable rather than `console`)
 * Proper testing for `notify_stats` (output to a `log` variable)
 * Proper testing for parsers (using `eval()` CommonJS module compilation)
 * Proper testing for `require('./node_modules/whatever.jpg')` test case

## License

[MIT](LICENSE)
[npm-image]: https://img.shields.io/npm/v/webpack-isomorphic-tools.svg
[npm-url]: https://npmjs.org/package/webpack-isomorphic-tools
[travis-image]: https://img.shields.io/travis/halt-hammerzeit/webpack-isomorphic-tools/master.svg
[travis-url]: https://travis-ci.org/halt-hammerzeit/webpack-isomorphic-tools
[downloads-image]: https://img.shields.io/npm/dm/webpack-isomorphic-tools.svg
[downloads-url]: https://npmjs.org/package/webpack-isomorphic-tools
[coveralls-image]: https://img.shields.io/coveralls/halt-hammerzeit/webpack-isomorphic-tools/master.svg
[coveralls-url]: https://coveralls.io/r/halt-hammerzeit/webpack-isomorphic-tools?branch=master

<!---
[gratipay-image]: https://img.shields.io/gratipay/dougwilson.svg
[gratipay-url]: https://gratipay.com/dougwilson/
-->
