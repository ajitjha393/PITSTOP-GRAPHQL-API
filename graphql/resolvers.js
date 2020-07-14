const User = require('../models/user')
const { hash } = require('bcryptjs')

// const validator = require('validator')
const { default: validator } = require('validator')

module.exports = {
	createUser: async ({ userInput }, req) => {
		const { email, name, password } = userInput

		const errors = []

		if (!validator.isEmail(email)) {
			errors.push({
				message: 'Email is invalid!',
			})
		}

		if (!validator.isLength(password, { min: 5 })) {
			errors.push({
				message: 'Password too short!',
			})
		}

		if (errors.length > 0) {
			const err = new Error('Invalid input Data')
			err.statusCode = 422
			err.data = errors
			throw err
		}

		const existingUser = await User.findOne({ email: email })
		if (existingUser) {
			throw new Error('User exists already!')
		}

		const hashedPassword = await hash(password, 12)
		const user = new User({
			name,
			email,
			password: hashedPassword,
		})

		const storedUser = await user.save()

		return {
			...storedUser._doc,
			_id: storedUser._id.toString(),
		}
	},
}
