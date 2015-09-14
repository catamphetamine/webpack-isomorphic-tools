# webpack-isomorphic-tools

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

<!---
[![Gratipay][gratipay-image]][gratipay-url]
-->

Is a small helper module providing support for isomorphic (universal) rendering when using Webpack.

## What it does and why is it needed?

Javascript allows you to run all your `.js` code (Views, Controllers, Stores, and so on) both on the client and the server, and Webpack gives you the ability to just `require()` your javascript modules both on the client and the server so that the same code works both on the client and the server automagically (I guess that was the main purpose of Webpack).

When you write your web application in React, you create the main `style.css` where you describe all your base styles (h1, h2, a, p, nav, footer, fonts, etc).

Then, you use inline styles to style each React component individually (use [react-styling](https://github.com/halt-hammerzeit/react-styling) for that).

What about that `style.css` file? On the server in development mode it needs to be injected automagically through javascript to support hot module reload, so you don't need to know the exact path to it on disk because it isn't even a `.css` file on your disk: it's actually a javascript file because that's how Webpack [style-loader](https://github.com/webpack/style-loader) works. So you don't need to `require()` your styles in the server code because you simply can't because there are no such files. (You only need to require `style.css` in your `client-application.js` which is gonna be a Webpack entry point)

What about fonts? Fonts are parsed correctly by Webpack [css-loader](https://github.com/webpack/css-loader) when it finds `url()` sections in your main `style.css`, so no issues there.

What's left are images. Images are `require()`d in React components and then used like this:

```javascript
// alternatively one can use import, but in this case hot reloading won't work
// import image from '../image.png'

// next you just `src` your image inside your `render()` method
class Photo extends React.Component
{
  render()
  {
    // when Webpack url-loader finds this `require()` call 
    // it will copy `image.png` to your build folder 
    // and name it something like `9059f094ddb49c2b0fa6a254a6ebf2ad.png`, 
    // because we are using the `[hash]` file naming feature of Webpack url-loader
    // which (feature) is required to make browser caching work correctly
    const image = require('../image.png')

    return <img src={image}/>
  }
}
```

It works on the client because Webpack intelligently replaces all the `require()` calls for you.
But it wouldn't work on the server because Node.js only knows how to `require()` javascript modules.
What `webpack-isomorphic-tools` does is it makes the code above work on the server too (and much more), so that you can have your isomorphic (universal) rendering (e.g. React).

What about javascripts on the Html page?

When you render your Html page on the server you need to include all the client scripts using `<script src={...}/>` tags. And for that purpose you need to know the real paths to your Webpack compiled javascripts. Which are gonna have names like `main-9059f094ddb49c2b0fa6a254a6ebf2ad.js` because we are using the `[hash]` file naming feature of Webpack which is required to make browser caching work correctly. And `webpack-isomorphic-tools` tells you these filenames (see the [Usage](#usage) section). 

It also tells you real paths to your CSS styles in case you're using [extract-text-webpack-plugin](https://github.com/webpack/extract-text-webpack-plugin) which is usually the case for production build.

Aside all of that, `webpack-isomorphic-tools` is highly extensible, and finding the real paths for your assets is just the simplest example of what it's capable of. Using [custom configuration](#configuration) one can make `require()` calls return virtually anything (not just String, it may be a JSON object, for example). For example, if you're using Webpack [css-loader](https://github.com/webpack/css-loader) modules feature (also referred to as ["local styles"](https://medium.com/seek-ui-engineering/the-end-of-global-css-90d2a4a06284)) you can make `require(*.css)` calls return JSON objects with CSS class names like they do in [react-redux-universal-hot-example](https://github.com/erikras/react-redux-universal-hot-example#styles) (it's just a demonstration of what one can do with `webpack-isomorphic-tools`, and I'm not using this "modules" feature of `ccs-plugin` in my projects).

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

  output:
  {
    publicPath: '(required) web path for static files here'
  },

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

What does `.development()` method do? It enables development mode. In short, when in development mode, it disables asset caching (and enables asset hot reload). Just call it if you're developing your project with `webpack-dev-server` using this config (and don't call it for production webpack build).

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
      extensions: ['png', 'jpg', 'gif', 'ico', 'svg'],
      parser: Webpack_isomorphic_tools_plugin.url_loader_parser // see Configuration and API sections for more info on this parameter
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
// enter development mode if needed 
// (for example, based on a Webpack DefinePlugin variable)
.development(_development_)
// initializes a server-side instance of webpack-isomorphic-tools
// (the first parameter is the base path for your project)
.server(project_base_path, function()
{
  // webpack-isomorphic-tools is all set now.
  // here goes all your web application code:
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
  // https://github.com/halt-hammerzeit/cinema/blob/master/code/server/webpage%20rendering.js
  const page_component = [determine your page component here using request.path]

  // for a Redux Flux store implementation you can see the same example:
  // https://github.com/halt-hammerzeit/cinema/blob/master/code/server/webpage%20rendering.js
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
  javascript:
  {
    main: '/assets/main-d8c29e9b2a4623f696e8.js'
  },

  styles:
  {
    main: '/assets/main-d8c29e9b2a4623f696e8.css'
  },

  images:
  {
    './assets/images/cat.jpg': '/assets/9059f094ddb49c2b0fa6a254a6ebf2ad.jpg',
    
    './assets/images/icon/32x32.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAQAAADZc7J/AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQffBhcWAg6gFw6bAAAB60lEQVRIx+3UTUjUQRzG8c+u/n2BDe3lIJtQSuYhsPTQG+TFYLulguStoA5dPHYogoKigoi8dIsOCd0iiC4JFYFQBAVZEUgklWVQqam4vu1uF111d1310qWe0/yemfnyzPyG4b8KllQl6jWqNuX3nFNun/0qjJpYGRB1TkyRWu0C76Q0uKhOkT1aDfqSP0uxTpetR1i9e2Iq3HVUCQKt7tuWP0GDmDOGkfJd3GEbhFwzg6T3alR5lg0Ip0fVPhhKV2+UqfNcMu28sjlXggVAXEQoXZVKmlC2aGXETH5Ary3q026zPg8dtGnOKXPIi/x3MCJwUtyUqBN2uarXTi1+Cql1yqibuTKElsCaHBFBn1v6sU67RoGkHl3GciVYDNiuWVSphDEJYaSkRBSbNqLHI7PZgML0qNIFrz3OwqZAuQ6BB8KqRL01nA3YbdCVRW3L1KxGTx1zQMI3p01nAkqN5NnOkBrXJZw1qlOlj5mAlTQuqluXcRGTSrOPsJJeajOQzphaOyDucy47vGrAMvqLgCLlS97HmgH17mgRzFWhbEAq43/M1EYF2p1XoVAgMW8vdKFfmx0+LbO9WJNut3W44Ze4r/MTC6cKHBczutDhJSrxwyWDAntt9cRANoCwqLKcgJApAyZXfV//mP4AWg969geZ6qgAAAAldEVYdGRhdGU6Y3JlYXRlADIwMTUtMDYtMjNUMjI6MDI6MTQrMDI6MDBG88r0AAAAJXRFWHRkYXRlOm1vZGlmeQAyMDE1LTA2LTIzVDIyOjAyOjE0KzAyOjAwN65ySAAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAAASUVORK5CYII='
  }
}
```

And that's it, now you can `require()` your assets "isomorphically" (both on client and server).

## A working example

`webpack-isomorphic-tools` are featured in [react-redux-universal-hot-example](https://github.com/erikras/react-redux-universal-hot-example).

Also for a comprehensive example of isomorphic React rendering you can look at this sample project:

* clone [this repo](https://github.com/halt-hammerzeit/cinema)
* `npm install`
* `npm run dev`
* wait a moment for Webpack to finish the first build (green stats will appear in the terminal)
* go to `http://localhost:3000`
* `Ctrl + C`
* `npm run production`
* go to `http://localhost:3000`

Some source code guidance for this particular project:

* [webpack-isomorphic-tools configuration](https://github.com/halt-hammerzeit/cinema/blob/master/webpack/isomorphic.js)
* [webpack-isomorphic-tools client initialization](https://github.com/halt-hammerzeit/cinema/blob/master/webpack/development%20server.js)
* [webpack-isomorphic-tools server initialization](https://github.com/halt-hammerzeit/cinema/blob/master/code/server/entry.js)
* [webpage rendering express middleware](https://github.com/halt-hammerzeit/cinema/blob/master/code/server/webpage%20rendering.js)
* [the Html file](https://github.com/halt-hammerzeit/cinema/blob/master/code/client/html.js)

## Configuration

Available configuration parameters:

```javascript
{
  // sets "development" mode flag.
  // see the API section below for method .development()
  // for more explanation about what "development" mode does
  // and when is it needed.
  development: true, // is false by default

  // debug mode.
  // when set to true, lets you see debugging messages in the console,
  // and also outputs 'webpack-stats.debug.json' file with Webpack stats.
  // (you'll be interested in the contents of this file 
  //  in case you're writing your own filter, naming or parser 
  //  for some asset type)
  debug: true, // is false by default

  // By default it creates 'webpack-assets.json' file at 
  // webpack_configuration.context (which is your project folder).
  // You can change the assets file path as you wish
  // (therefore changing both folder and filename).
  // 
  // The folder derived from this parameter will also be used
  // to store 'webpack-stats.debug.json' file in case you're in debug mode
  //
  // (relative to webpack_configuration.context which is your project folder)
  // (these aren't actually 'stats', these are some values derived from Webpack 'stats')
  webpack_assets_file_path: 'webpack-stats.json', // is 'webpack-assets.json' by default

  // here you are able to add some file paths 
  // for which the require() call will bypass webpack-isomorphic-tools
  // (relative to the project base folder, e.g. ./sources/server/kitten.jpg.js)
  exceptions: [],

  // here you can define all your asset types
  assets:
  {
    // asset_type will appear in:
    //  * webpack-assets.json
    //  * .assets() method call result
    //  * .regular_expression(asset_type) method call
    asset_type: 
    {
      // which file types belong to this asset type
      extension: 'png', // or extensions: ['png', 'jpg', ...],

      // [optional]
      // 
      // determines which webpack stats modules 
      // belong to this asset type
      //
      // arguments:
      //
      //  module             - a webpack stats module
      //
      //  regular_expression - a regular expression 
      //                       composed of this asset type's extensions
      //                       e.g. /\.scss$/, /\.(ico|gif)$/
      //
      //  options            - various options
      //                       (development mode flag,
      //                        debug mode flag,
      //                        assets base path (on the disk or on the network),
      //                        regular_expressions{} for each asset type (by name),
      //                        webpack stats json object)
      //
      //  log
      // 
      // returns: a Boolean
      //
      // by default is: "return regular_expression.test(module.name)"
      //
      filter: function(module, regular_expression, options, log)
      {
        return regular_expression.test(module.name)
      },

      // [optional]
      //
      // transforms a webpack stats module name 
      // to an asset name
      //
      // arguments:
      //
      //  module  - a webpack stats module
      //
      //  options - various options
      //            (development mode flag,
      //             debug mode flag,
      //             assets base path (on the disk or on the network),
      //             regular_expressions{} for each asset type (by name),
      //             webpack stats json object)
      //
      //  log
      // 
      // returns: a String
      //
      // by default is: "return module.name"
      //
      naming: function(module, options, log)
      {
        return module.name
      },

      // [required]
      // 
      // parses a webpack stats module object
      // for an asset of this asset type
      // to whatever you need to get 
      // when you require() these assets 
      // in your code later on.
      //
      // in other words: require(...) = function(...) { ... return parser(...) }
      //
      // arguments:
      //
      //  module  - a webpack stats module
      //
      //  options - various options
      //            (development mode flag,
      //             debug mode flag,
      //             assets base path (on the disk or on the network),
      //             regular_expressions{} for each asset type (by name),
      //             webpack stats json object)
      //
      //  log
      // 
      // returns: whatever (could be a filename, could be a JSON object, etc)
      //
      parser: function(module, options, log)
      {
        log.info('# module name', module.name)
        log.info('# module source', module.source)
        log.info('# assets base path', options.assets_base_path)
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

## API

#### Constructor

(both Webpack plugin and server tools)

Takes an object with options (see [Configuration](#configuration) section above)

#### .development(true or false or undefined -> true)

(both Webpack plugin and server tools)

Is it development mode or is it production mode? By default it's production mode. But if you're instantiating `webpack-isomorphic-tools/plugin` for use in Webpack development configuration, or if you're instantiating `webpack-isomorphic-tools` on server when you're developing your project, then you should call this method to enable asset hot reloading (and disable asset caching). It should be called right after the constructor.

#### .regular_expression(asset_type)

(Webpack plugin)

Returns the regular expression for this asset type (based on this asset type's `extension` (or `extensions`))

#### Webpack_isomorphic_tools_plugin.url_loader_parser

(Webpack plugin)

A parser (see [Configuration](#configuration) section above) for Webpack [url-loader](https://github.com/webpack/url-loader), also works for Webpack [file-loader](https://github.com/webpack/file-loader). Use it for your images, fonts, etc.

#### .server(project_path, callback)

(server tools)

Initializes a server-side instance of `webpack-isomorphic-tools` with the base path for your project and makes all the server-side `require()` calls work. The `project_path` parameter must be identical to the `context` parameter of your Webpack configuration and is needed to locate `webpack-assets.json` (contains the assets info) which is output by Webpack process. The callback is called when `webpack-assets.json` has been found (it's needed for development because `webpack-dev-server` and your application server are usually run in parallel).

#### .refresh()

(server tools)

Refreshes your assets info (re-reads `webpack-assets.json` from disk) and also flushes cache for all the previously `require()`d assets

#### .assets()

(server tools)

Returns the contents of `webpack-assets.json` which is created by `webpack-isomorphic-tools` in your project base folder

## Gotchas

### .gitignore

Make sure you add this to your `.gitignore`

```
# webpack-isomorphic-tools
/webpack-stats.debug.json
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
  webpack_isomorhic_tools.refresh()
}
```

It does exactly as it says: it refreshes everything on page reload when you're in development mode. And to leverage this feature you need to use dynamic module loading as opposed to static one through `import`s. This can be done by `require()`ing your assets, and not at the top of the file where all `require()`s usually go but, say, inside the `reder()` method for React components.

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

Also it's good to know that the way all this `require('./asset.whatever_extension')` magic is based on [Node.js require hooks](http://bahmutov.calepin.co/hooking-into-node-loader-for-fun-and-profit.html) and it works with `import`s only when your ES6 code is transpiled by Babel which simply replaces all the `import`s with `require()`s. For now, everyone out there uses Babel, both on client and server. But when the time comes for ES6 to be widely natively adopted, and when a good enough ES6 module loading specification is released, then I (or someone else) will step in and port this "require hook" to ES6 to work with `import`s.

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

While actively developing, one can use

```sh
npm run watch
```

in a terminal. This will watch the file system and run tests automatically 
whenever you save a js file.

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