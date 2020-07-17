const User = require('../models/user')
const Post = require('../models/post')
const { hash } = require('bcryptjs')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
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

	login: async ({ email, password }, req) => {
		const user = await User.findOne({ email })
		if (!user) {
			const err = new Error('No User Found!')
			err.statusCode = 401 // Not Authenticated
			throw err
		}

		if (!(await bcrypt.compare(password, user.password))) {
			const err = new Error('Password is incorrect!')
			err.statusCode = 401
			throw err
		}

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

		return {
			token: token,
			userId: user._id.toString(),
		}
	},

	createPost: async ({ postInput }, req) => {
		if (!req.isAuth) {
			const err = new Error('User not Authenticated!')
			err.statusCode = 401
			throw err
		}

		const user = await User.findOne(req.userId)

		if (!user) {
			const err = new Error('Invalid User!')
			err.statusCode = 401
			throw err
		}

		const { title, content, imageUrl } = postInput
		const errors = []
		if (!validator.isLength(title, { min: 5 })) {
			errors.push({
				message: 'Title Length too short!',
			})
		}

		if (!validator.isLength(content, { min: 5 })) {
			errors.push({
				message: 'Content Length too short!',
			})
		}
		if (errors.length > 0) {
			const err = new Error('Invalid input Data')
			err.statusCode = 422
			err.data = errors
			throw err
		}

		// Will retrieve user and add that detail in posts

		const post = new Post({
			title,
			content,
			imageUrl,
			creator: user,
		})

		const createdPost = await post.save()
		user.posts.push(createdPost)
		await user.save()

		return {
			...createdPost._doc,
			_id: createdPost._id.toString(),
			createdAt: createdPost.createdAt.toISOString(),
			updatedAt: createdPost.updatedAt.toISOString(),
		}
	},
}
