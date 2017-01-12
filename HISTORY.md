2.6.6 / 12.01.2017
===================

  * @pmdroid - added support for querystring in filenames

2.6.4 / 01.11.2016
===================

  * Fixed a bug when a CSS compilation error would terminate Webpack build

2.6.2 / 11.10.2016
===================

  * Undeprecated `.development()` method for the webpack plugin (since `process.env.NODE_ENV` makes no sense there)

2.6.0 / 11.10.2016
===================

  * Deprecated `.development()` method in favour of examining `process.env.NODE_ENV`

2.5.8 / 29.08.2016
===================

  * Fixed Windows error "Error: connect EADDRNOTAVAIL 0.0.0.0:9999"

2.5.7 / 10.08.2016
===================

  * Renamed `verbose` option to `verbosity` (can be one of: `undefined`, `"no webpack stats"`, `"webpack stats for each build"`)

2.5.3 / 28.07.2016
===================

  * Added support for loader-powered `require()`d paths (e.g. 'responsive?sizes=[]!./images/dog.jpg')

2.5.2 / 27.07.2016
===================

  * Small bugfix for `port` setting (fixing endless "(waiting for the first webpack build to finish)")

2.5.0 / 24.07.2016
===================

  * Added an experimental `port` setting which makes it possible to keep `webpack-assets.json` in RAM as opposed to constantly writing it to disk (implemented this feature just for fun)

2.3.1 / 15.06.2016
===================

  * Renamed `require_context` option to `patch_require`
  * Now supports `require.ensure()`

2.3.0 / 18.05.2016
===================

  * Removed `babel-runtime` dependency (merged pull request from @xdissent)

2.2.29 / 12.02.2016
===================

  * Added support for Webpack's `resolve.modulesDirectories` parameter

2.2.27 / 11.02.2016
===================

  * Added experimental support for `require.context()` function

2.2.25 / 16.01.2016
===================

  * Introduced `verbose` boolean flag

2.2.19, 2.2.20, 2.2.21 / 05.12.2015
===================

  * A small bugfix for not being able to load `webpack-assets.json` having defined asset type for `json` extension
  * Addressing some aliasing issues

2.2.11 / 07.11.2015
===================

  * Refactored and made better the support for Webpack "aliasing" feature

2.2.8, 2.2.9, 2.2.10 / 06.11.2015
===================

  * Added support for Webpack "aliasing" feature

2.2.7 / 04.11.2015
===================

  * `webpack-stats.json` are now output only in debug mode

2.2.6 / 03.11.2015
===================

  * Fixed `parser`s returning not javascript module source but text, objects, etc
  * .url_loader_parser now is equal to the default parser

2.2.5 / 03.11.2015
===================

  * Fixed broken hot reloading in development mode

2.2.0, 2.2.1, 2.2.2, 2.2.3, 2.2.4 / 02.11.2015
===================

  * Asset CommonJS module source codes are now compiled at Webpack build stage (in a Webpack plugin)
  * webpack-assets.json are now pretty

2.1.0, 2.1.1, 2.1.2 / 01.11.2015
===================

  * Added support for arbitrary path require()ing (even for the weirdest ones)
  * Fixed a bug when webpack module sources didn't compile
  * Webpack stats are now always generated and are needed too (both in production and development)

2.0.0, 2.0.1, 2.0.2 / 30.10.2015
===================

  * Introduced true and seamless Webpack module source parsing
  * Renamed `naming` function to `path`
  * Parsers: `url_loader_parser`, `css_loader_parser`, `css_modules_loader_parser`, `style_loader_filter`
  * `exclude` now moved to individual asset types

1.0.0, 1.0.1 / 19.10.2015
===================

  * Bumped version to 1.0.0 (mature enough)
  * Added extensive testing
  * `.server()` method now can return a Promise if not given a callback

0.9.2, 0.9.3 / 17.10.2015
===================

  * guard against empty `module.source` (pull request merged)

0.9.1 / 02.10.2015
===================

  * readme rewrite (update for npmjs.org)

0.9.0 / 26.09.2015
===================

  * "exceptions" is now called "exclude"
  * "exclude" supports regular expressions

0.8.0 / 16.08.2015
===================

  * Changed constructor arguments: assets are now a hash as opposed to array
  * Refactored into two parts: server side and Webpack plugin
  * API changed

0.7.0 / 14.08.2015
===================

  * Changed constructor arguments: removed Webpack configuration
  * Changed server-side instantiation procedure: .server() now replaces .register().ready() chain

0.6.0 / 11.08.2015
===================

  * Changed asset functions' "options" argument: the "environment" parameter is replaced by "development" flag

0.5.0 / 11.08.2015
===================

  * Accidentially published a next "minor" version. Is a "patch" really

0.4.0 / 11.08.2015
===================

  * The assets info file is now called "webpack-assets.json" by default (as opposed to "webpack-stats.json")
  * The assets info file is now created in the project folder by default
  * Added extensive debug logging
  * It now outputs webpack stats JSON object when in debug mode

0.3.0 / 10.08.2015
===================

  * Renamed "path_parser" asset parameter to "parser"
  * Changed parser function arguments

0.2.0 / 10.08.2015
===================

  * Extracted webpack configuration population logic into a separate method
  * "assets" is now an array as opposed to JSON object

0.1.0 / 10.08.2015
===================

  * Initial release