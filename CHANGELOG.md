`4.0.0` / `02.03.2021`
======================

* Nothing new.

* One of the users [has pointed out](https://github.com/catamphetamine/webpack-isomorphic-tools/pull/166) that Webpack 4/5 no longer works with some CSS files. A proposed workaround is to pass `source: true` option to Webpack compiler.

* Passing the `source: true` option could hypothetically possibly break older Webpacks' compilers if they strictly check the list of passed options. Since no one would test the change with Webpack 1/2/3, a new "major" version is published just so it doesn't break anyone's code.