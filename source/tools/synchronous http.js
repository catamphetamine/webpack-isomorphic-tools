import request from 'sync-request'

export default function http_request(port)
{
	// "0.0.0.0" won't work on Windows
	// (Error: connect EADDRNOTAVAIL 0.0.0.0:9999)
	const response = request('GET', `http://127.0.0.1:${port}`, { timeout: 1000, socketTimeout: 1000 })

	// status codes 4xx have been already thrown before this line.
	// not sure about other status codes, so just in case:
	if (response.statusCode !== 200)
	{
		const error = new Error(response.statusCode + ' ' + response.getBody('utf8'))
		error.code = response.statusCode
		throw error
	}

	return JSON.parse(response.getBody('utf8'))
}