const { validationResult } = require('express-validator/check')
const Post = require('../models/post')
const User = require('../models/user')
const path = require('path')
const fs = require('fs')
const io = require('../socket')

exports.getPosts = async (req, res, next) => {
	// 200 means success
	try {
		const currentPage = req.query.page || 1
		const perPage = 2

		let totalItems = await Post.find().countDocuments()

		const posts = await Post.find()
			.populate('creator')
			.sort({ createdAt: -1 })
			.skip((currentPage - 1) * perPage)
			.limit(perPage)

		return res.status(200).json({
			message: 'All posts fetched Successfully',
			posts,
			totalItems,
		})
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500
		}

		next(err)
	}
}

exports.postAddPost = async (req, res, next) => {
	const errors = validationResult(req)
	if (!errors.isEmpty()) {
		const err = new Error('Validation Failed, Entered Data is incorrect')
		err.statusCode = 422
		return next(err)
	}

	if (!req.file) {
		const err = new Error('No image Provided...')
		err.statusCode = 422
		return next(err)
	}

	const { title, content } = { ...req.body }

	// Create posts in db

	// Changed Creator from {name: 'Bishwajit'} to userId storedd in req
	const post = new Post({
		title,
		content,
		imageUrl: req.file.path,
		creator: req.userId,
	})

	try {
		const resPost = await post.save()
		console.log(resPost)

		// Adding the new post to the posts array
		const user = await User.findById(req.userId)

		user.posts.push(resPost)
		await user.save()

		// Emitting create post event to all real-time-clients connected via websockets
		io.getIO().emit('posts', {
			action: 'create',
			post: {
				...resPost._doc,
				creator: { _id: req.userId, name: user.name },
			},
		})

		// 201 Success in creating a resource in backend
		return res.status(201).json({
			message: 'Post created Successfully',
			post: resPost,
			creator: {
				_id: user._id,
				name: user.name,
			},
		})
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500
		}

		next(err)
	}
}

exports.getPost = async (req, res, next) => {
	const postId = req.params.postId
	try {
		const fetchedPost = await Post.findById(postId)
		if (!fetchedPost) {
			const err = new Error('Could Not Find a post.')
			err.statusCode = 404
			throw err
		}

		return res.status(200).json({
			message: 'Post Fetched Successfully',
			post: fetchedPost,
		})
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500
		}

		next(err)
	}
}

exports.updatePost = async (req, res, next) => {
	const postId = req.params.postId

	const errors = validationResult(req)
	if (!errors.isEmpty()) {
		const err = new Error('Validation Failed, Entered Data is incorrect')
		err.statusCode = 422
		return next(err)
	}

	const title = req.body.title
	const content = req.body.content
	let imageUrl = req.body.image

	if (req.file) {
		imageUrl = req.file.path
	}

	if (!imageUrl) {
		const err = new Error('No file picked...')
		err.statusCode = 422
		return next(err)
	}

	try {
		// We use populate because we have userdata ref in creator
		const post = await Post.findById(postId).populate('creator')
		if (!post) {
			const err = new Error('Could Not Find a post.')
			err.statusCode = 404
			throw err
		}

		if (post.creator._id.toString() !== req.userId.toString()) {
			const err = new Error('Not Authorized for Editing This Product')
			err.statusCode = 403 //Operation forbidden
			throw err
		}

		if (imageUrl !== post.imageUrl) {
			clearImage(post.imageUrl)
		}
		post.title = title
		post.content = content
		post.imageUrl = imageUrl

		const result = await post.save()

		// Emitting update post event to all real-time-clients connected via websockets
		io.getIO().emit('posts', {
			action: 'update',
			post: result,
		})

		return res.status(200).json({
			message: 'Post Updated',
			post: result,
		})
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500
		}

		next(err)
	}
}

exports.deletePost = async (req, res, next) => {
	try {
		const postId = req.params.postId

		const post = await Post.findById(postId)
		if (!post) {
			const err = new Error('Could Not Find a post.')
			err.statusCode = 404
			throw err
		}
		if (post.creator.toString() !== req.userId.toString()) {
			const err = new Error('Not Authorized for Deleting This Product')
			err.statusCode = 403 //Operation forbidden
			throw err
		}
		clearImage(post.imageUrl)

		const result = await Post.findByIdAndRemove(postId)
		const user = await User.findById(req.userId)

		console.log(user, user.posts)
		user.posts.pull(postId)
		await user.save()

		io.getIO().emit('posts', {
			action: 'delete',
			post: result,
		})

		return res.status(200).json({
			message: 'Post Deleted Successfully',
			post: result,
		})
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500
		}

		next(err)
	}
}

const clearImage = (filepath) => {
	filepath = path.join(__dirname, '..', filepath)
	fs.unlink(filepath, (err) => console.log(err))
}
