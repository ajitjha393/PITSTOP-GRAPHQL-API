const express = require('express')

const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const { credentials } = require('./utils/credentials')
const path = require('path')
const fs = require('fs')
const multer = require('multer')

const app = express()

const { graphqlHTTP } = require('express-graphql')

const graphqlSchema = require('./graphql/schema')

const graphqlResolvers = require('./graphql/resolvers')

const auth = require('./middleware/is-auth')

const fileStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, 'images')
	},

	filename: (req, file, cb) => {
		cb(null, new Date().toISOString() + '-' + file.originalname)
	},
})

const fileFilter = (req, file, cb) => {
	if (
		file.mimetype === 'image/png' ||
		file.mimetype === 'image/jpg' ||
		file.mimetype === 'image/jpeg'
	) {
		cb(null, true)
	} else {
		cb(null, false)
	}
}

// app.use(bodyParser.urlencoded()) /*This works when data is submitted through form*/

app.use(bodyParser.json()) /** application/json */

app.use(
	multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
)

app.use('/images', express.static(path.join(__dirname, 'images')))

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader(
		'Access-Control-Allow-Methods',
		'GET, POST, PUT, PATCH, DELETE'
	)
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
	// For handling graphql options error
	if (req.method === 'OPTIONS') {
		return res.sendStatus(200)
	}
	next()
})

app.use(auth)

app.put('/add-image', (req, res, next) => {
	if (!req.isAuth) {
		const err = new Error('User not Authenticated!')
		err.statusCode = 401
		throw err
	}

	// If no file is selected
	if (!req.file) {
		return res.status(200).json({
			message: 'No image File provided!',
		})
	}

	if (req.body.oldPath) {
		// This means new image while editing
		clearImage(req.body.oldPath)
	}

	// And now return the new File path back
	return res.status(201).json({
		message: 'File path Stored!',
		imageUrlPath: req.file.path,
	})
})

app.use(
	'/graphql',
	graphqlHTTP({
		schema: graphqlSchema,
		rootValue: graphqlResolvers,
		graphiql: true,
		customFormatErrorFn(err) {
			if (!err.originalError) {
				return err
			}
			const data = err.originalError.data
			const message = err.message || 'An Error Occurred...'
			const status = err.originalError.statusCode || 500

			return {
				message,
				status,
				data,
			}
		},
	})
)

// General Express Error Handling middleware
app.use((err, req, res, next) => {
	console.log(err)
	const statusCode = err.statusCode || 500
	const message = err.message
	const data = err.data

	return res.status(statusCode).json({
		message,
		data,
	})
})

// Connecting to DB

console.log(credentials)
mongoose
	.connect(credentials)
	.then((_) => {
		app.listen(process.env.PORT || 8080)
		console.clear()
		console.log('Connected')
	})
	.catch((err) => console.log(err))

const clearImage = (filepath) => {
	filepath = path.join(__dirname, '..', filepath)
	fs.unlink(filepath, (err) => console.log(err))
}
