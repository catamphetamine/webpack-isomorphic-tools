// is used only in require.context() test
if (require.context)
{
	module.exports = require.context('./test/node_modules', true, /^\.\/.*\.js$/)
}
else
{
	module.exports = { broken: true }
}