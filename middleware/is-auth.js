const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
	// Extract token from Header
	const authHeader = req.get('Authorization')
	if (!authHeader) {
		req.isAuth = false
		console.log('header')
		return next()
	}

	const token = authHeader.split(' ')[1]
	let decodedToken = null

	try {
		// This decodes as well as verifies the token
		decodedToken = jwt.verify(token, 'pitstopSecretKey')
	} catch (err) {
		req.isAuth = false
		console.log('try catch')
		return next()
	}

	if (!decodedToken) {
		req.isAuth = false
		console.log('token')
		return next()
	}

	// Added this userId to the req so that it can be used for authorization afterwards
	req.userId = decodedToken.userId
	req.isAuth = true
	next()
}
