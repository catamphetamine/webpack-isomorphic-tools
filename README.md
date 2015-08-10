# webpack-isomorphic-tools

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

<!---
[![Gratipay][gratipay-image]][gratipay-url]
-->

Is a small helper module providing full support for isomorphic (universal) rendering when using Webpack.

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

When you render your Html page on the server you need to include all the client scripts using `<script src={...}/>` tags. And for that purpose you need to know the real paths to your Webpack compiled javascripts. Which are gonna have names like `main-9059f094ddb49c2b0fa6a254a6ebf2ad.js` because we are using the `[hash]` file naming feature of Webpack which is required to make browser caching work correctly. And `webpack-isomorphic-tools` tells you these filenames (see the [Usage](#usage) section). It also tells you real paths to your Css styles in case you're using [extract-text-webpack-plugin](https://github.com/webpack/extract-text-webpack-plugin) (which is usually the case for production build).

For a comprehensive example of isomorphic React rendering you can look at this sample project:

* [webpack-isomorphic-tools initialization](https://github.com/halt-hammerzeit/cinema/blob/master/code/server/entry.js)
* [webpage rendering express middleware](https://github.com/halt-hammerzeit/cinema/blob/master/code/server/webpage%20rendering.js)
* [the Html file](https://github.com/halt-hammerzeit/cinema/blob/master/code/client/html.js)

## Installation

```bash
$ npm install webpack-isomorphic-tools
```

## Usage

First you create your Webpack configuration like you usually do except that you don't add module loaders for the `assets` you decide to manage with `webpack_isomorphic_tools` (`webpack_isomorphic_tools` will add these module loaders to your Webpack configuration instead of you doing it by yourself)

### webpack.config.js

```javascript
var Webpack_isomorphic_tools = require('webpack-isomorphic-tools')

// usual Webpack configuration
var webpack_configuration =
{
  context: 'your project path here',

  output:
  {
    path: 'filesystem static files path here',
    publicPath: 'web path for static files here'
  },

  module:
  {
    loaders:
    [{
      {
        test: /\.js$/,
        include:
        [
          'your javascript sources path here'
        ],
        loaders: ['babel-loader?stage=0&optional=runtime&plugins=typecheck']
      }
    }]
  },

  ...
}

// webpack-isomorphic-tools settings reside in a separate .js file to remove code duplication
// (it will be used in the server code too)
var webpack_isomorphic_tools = new Webpack_isomorphic_tools(webpack_configuration, require('./webpack-isomorphic-tools'))
webpack_isomorphic_tools.populate(webpack_configuration)

module.exports = webpack_configuration
```

### webpack-isomorphic-tools.js

```javascript
import Webpack_isomorphic_tools from 'webpack-isomorphic-tools'

export default
{
  // if this is the configuration for webpack-dev-server
  development: true, // false by default

  // by default it creates 'webpack-stats.json' file 
  // one level higher than your Webpack output.path.
  // if you want you can change the stats file path as you want:
  // webpack_stats_file_path: 'webpack-stats.json' // relative to your project folder

  assets:
  [{
    extensions: ['png', 'jpg', 'gif', 'ico', 'svg'],
    loader: 'url-loader?limit=10240', // any image below or equal to 10K will be converted to inline base64 instead
    // loaders: ['you can specify a list of loaders too']
    // or you can specify no loader at all and in that case no module loader would be added to webpack
    // path: 'you can constrain loading assets by path'
    // paths: ['or by a list of paths']
    parser: Webpack_isomorphic_tools.url_loader_parser // you don't need to know what this function does but you can always look at the sources (it's an extension point along with a couple more)
  }]
}
```

Then you create your server side instance of `webpack-isomorphic-tools` and register a Node.js require hook in the very main server script (and your web application code will reside in the server.js file which is `require()`d in the bottom):

### main.js

```javascript
var webpack_configuration = require('./webpack.config.js')
var Webpack_isomorphic_tools = require('webpack-isomorphic-tools')

// the same line as in webpack.config.js
var webpack_isomorphic_tools = new Webpack_isomorphic_tools(webpack_configuration, require('./webpack-isomorphic-tools'))

// registers Node.js require() hooks for your assets
// (these hooks must be set before you require() any of your React components)
webpack_isomorphic_tools.register()

// will be used in express middleware
global.webpack_isomorphic_tools = webpack_isomorphic_tools

// now goes all your web application code
require('./server')
```

Then you, for example, create an express middleware to render your pages on the server

```javascript
import React from 'react'

// html page markup
import Html from './html'

// will be used in express_application.use(...)
export function page_rendering_middleware(request, response)
{
  // clear require() cache (used internally)
  // you don't need to understand the purpose of this call
  if (_development_)
  {
    webpack_isomorphic_tools.refresh()
  }

  // for react-router example of determining current page take a look this:
  // https://github.com/halt-hammerzeit/cinema/blob/master/code/server/webpage%20rendering.js
  const page_component = [determine your page component here using request.path]

  // for Redux Flux implementation you can see the same example:
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
    assets: PropTypes.object,
    component: PropTypes.object,
    store: PropTypes.object
  }

  render()
  {
    const { assets, component, store } = this.props

    // "import" will work here too 
    // but if you want hot reloading to work while developing your project
    // then you need to use require()
    // because import will only be executed a single time 
    // (when the application launches)
    const picture = require('./../cat.jpg')

    const html = 
    (
      <html lang="en-us">
        <head>
          <meta charSet="utf-8"/>
          <title>xHamster</title>

          {/* favicon */}
          <link rel="shortcut icon" href={assets.images_and_fonts['./client/images/icon/32x32.png'].path} />

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
            <script src={assets.javascript[script]}/>
          )}
        </body>
      </html>
    )

    return html
  }
}
```

And that's it: now your web application is isomorphic.

If you don't like having the `main.js` file before all your web application code you can omit creating `main.js`. In this case you won't register a Node.js require hook and the only difference would be a bit more verbose syntax when `require()`ing images in your web components:

```javascript
// (use webpack DefinePlugin for setting _client_ environment variable)
// (webpack_isomorphic_tools is taken from the "global" scope)
const picture = _client_ ? require('./../cat.png') : webpack_isomorphic_tools.require('./cat.png')
```

## Fully working example project

* clone [this repo](https://github.com/halt-hammerzeit/cinema)
* npm install
* npm run dev
* Ctrl + C after the green stats appear in the console
* npm run dev
* go to http://localhost:3000
* Ctrl + C
* npm run production
* go to http://localhost:3000

## Gotchas

Ideally you should run your Node.js web server after Webpack finishes its build process because `webpack-isomorphic-tools` adds its own plugins to the Webpack build chain which output a file with Webpack build info which is required to render pages on the server properly.

This is easily done in production environment where you can run Node.js server after Webpack build finishes. But when you're developing on your machine you likely run `webpack-dev-server` which never exits because it listens to changes infinitely. And that's why when running your project for the first time in development mode you can see this in the console:

```
***** File "g:\work\project\build\webpack-stats.json" not found. Using an empty 
      stub instead. This is normal because webpack-dev-server 
      and Node.js both start simultaneously and therefore webpack hasn't yet 
      finished its build process when Node.js server starts.
      Just restart your script after Webpack finishes the build 
      (when green letter will appear in the console)
```

This means that Webpack build process hasn't finished by the time your Node.js server ran (and `require()`d all the assets). You can simply wait a moment for Webpack to finish its build (you'll see green stats output in the console) and then just terminate the script and run it again, now with the Webpack build info file present.

## References

Initially based on [react-redux-universal-hot-example](https://github.com/erikras/react-redux-universal-hot-example) by Erik Rasmussen

Also the same codebase (as in the project mentioned above) can be found in [isomorphic500](https://github.com/gpbl/isomorphic500) by Giampaolo Bellavite

Also uses require() hooking techniques from [node-hook](https://github.com/bahmutov/node-hook) by Gleb Bahmutov

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

While actively developing, we recommend running

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