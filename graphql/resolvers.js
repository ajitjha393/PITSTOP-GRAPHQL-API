const User = require('../models/user')
const { hash } = require('bcryptjs')
const user = require('../models/user')

module.exports = {
	createUser: async ({ userInput }, req) => {
		const { email, name, password } = userInput
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
