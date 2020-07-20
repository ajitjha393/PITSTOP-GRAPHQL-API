const User = require('../models/user')
const Post = require('../models/post')
const { hash } = require('bcryptjs')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { clearImage } = require('../utils/files')
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

		const user = await User.findById(req.userId)

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

	posts: async ({ page }, req) => {
		if (!req.isAuth) {
			const err = new Error('User not Authenticated!')
			err.statusCode = 401
			throw err
		}

		if (!page) {
			page = 1
		}

		const postsPerPage = 2

		const totalPosts = await Post.find().countDocuments()
		const posts = await Post.find()
			.skip((page - 1) * postsPerPage)
			.limit(postsPerPage)
			.populate('creator')
			.sort({ createdAt: -1 })

		return {
			posts: posts.map((p) => ({
				...p._doc,
				_id: p._id.toString(),
				createdAt: p.createdAt.toISOString(),
				updatedAt: p.updatedAt.toISOString(),
			})),
			totalPosts,
		}
	},

	post: async ({ id }, req) => {
		if (!req.isAuth) {
			const err = new Error('User not Authenticated!')
			err.statusCode = 404
			throw err
		}

		const post = await Post.findById(id).populate('creator')
		if (!post) {
			const err = new Error('No Post Found!')
			err.statusCode = 404
			throw err
		}

		return {
			...post._doc,
			_id: post._id.toString(),
			createdAt: post.createdAt.toISOString(),
			updatedAt: post.updatedAt.toISOString(),
		}
	},

	updatePost: async ({ id, postInput }, req) => {
		if (!req.isAuth) {
			const err = new Error('User not Authenticated!')
			err.statusCode = 404
			throw err
		}

		const post = await Post.findById(id).populate('creator')
		if (!post) {
			const err = new Error('No Post Found!')
			err.statusCode = 404
			throw err
		}

		if (post.creator._id.toString() !== req.userId) {
			const err = new Error('Not Authorized!')
			err.statusCode = 403
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

		post.title = title
		post.content = content

		// If new image is provided then we change it!
		if (imageUrl !== 'undefined') {
			post.imageUrl = imageUrl
		}

		const updatedPost = await post.save()

		return {
			...updatedPost._doc,
			_id: updatedPost._id,
			createdAt: updatedPost.createdAt.toISOString(),
			updatedAt: updatedPost.updatedAt.toISOString(),
		}
	},

	deletePost: async ({ id }, req) => {
		if (!req.isAuth) {
			const err = new Error('User not Authenticated!')
			err.statusCode = 404
			throw err
		}

		const post = await Post.findById(id).populate('creator')
		if (!post) {
			const err = new Error('No Post Found!')
			err.statusCode = 404
			throw err
		}

		if (post.creator._id.toString() !== req.userId) {
			const err = new Error('Not Authorized!')
			err.statusCode = 403
			throw err
		}

		clearImage(post.imageUrl)

		const deletedPost = await Post.findByIdAndRemove(id)

		// Also clear post from User
		const user = await User.findById(req.userId)
		user.posts.pull(id)

		await user.save()

		return true
	},
}
