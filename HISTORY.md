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