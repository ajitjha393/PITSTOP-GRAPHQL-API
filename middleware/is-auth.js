const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
	// Extract token from Header
	const authHeader = req.get('Authorization')
	if (!authHeader) {
		const err = new Error(
			'Authorization header not set, cannot authenticate'
		)
		err.statusCode = 401
		throw err
	}

	const token = authHeader.split(' ')[1]
	let decodedToken = null

	try {
		// This decodes as well as verifies the token
		decodedToken = jwt.verify(token, 'pitstopSecretKey')
	} catch (err) {
		err.statusCode = 500
		throw err
	}

	if (!decodedToken) {
		const err = new Error('User is not Authenticated...')
		err.statusCode = 401
		throw err
	}

	// Added this userId to the req so that it can be used for authorization afterwards
	req.userId = decodedToken.userId
	next()
}
