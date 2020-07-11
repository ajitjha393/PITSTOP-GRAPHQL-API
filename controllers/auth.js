const User = require('../models/user')
const { validationResult } = require('express-validator/check')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

exports.signup = async (req, res, next) => {
	try {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			const err = new Error('Validation Failed')
			err.statusCode = 422
			err.data = errors.array()
			throw err
		}

		const { name, email, password } = { ...req.body }
		const hashedPassword = await bcrypt.hash(password, 12)

		const user = new User({
			name,
			email,
			password: hashedPassword,
		})

		const result = await user.save()
		return res.status(201).json({
			message: 'User was created Successfully!',
			userId: result._id,
			user: result,
		})
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500
		}

		next(err)
	}
}

exports.login = async (req, res, next) => {
	try {
		const email = req.body.email
		const password = req.body.password

		const user = await User.findOne({ email: email })
		if (!user) {
			const err = new Error('Cannot find User with this email!')
			err.statusCode = 401 //status code for unauthenticated
			throw err
		}

		if (!(await bcrypt.compare(password, user.password))) {
			const err = new Error('Wrong Password!')
			err.statusCode = 401
			throw err
		}

		// Now here will manage JSON web token for managing authentication

		const token = jwt.sign(
			{
				email: user.email,
				userId: user._id.toString(),
			},
			'pitstopSecretKey',
			{
				expiresIn: '1h',
			}
		)

		return res.status(200).json({
			token: token,
			userId: user._id.toString(),
		})
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500
		}

		next(err)
	}
}

exports.getUserStatus = async (req, res, next) => {
	try {
		const user = await User.findById(req.userId)
		if (!user) {
			const error = new Error('User not found.')
			error.statusCode = 404
			throw error
		}
		res.status(200).json({ status: user.status })
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500
		}
		next(err)
	}
}

exports.updateUserStatus = async (req, res, next) => {
	const newStatus = req.body.status
	try {
		const user = await User.findById(req.userId)
		if (!user) {
			const error = new Error('User not found.')
			error.statusCode = 404
			throw error
		}
		user.status = newStatus
		await user.save()
		res.status(200).json({ message: 'User updated.' })
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500
		}
		next(err)
	}
}
