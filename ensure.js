// is used only in require.ensure() test
if (require.ensure)
{
	require.ensure('./test/node_modules/whatever', function(require)
	{
		module.exports = require('./test/node_modules/whatever')
	})
}
else
{
	module.exports = { broken: true }
}