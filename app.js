const express = require('express')

const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const { credentials } = require('./utils/credentials')
const path = require('path')
const multer = require('multer')

const app = express()

const graphqlHttp = require('express-graphql')

const graphqlSchema = require('./graphql/schema')

const graphqlResolvers = require('./graphql/resolvers')

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
	next()
})

app.use(
	'/graphql',
	graphqlHttp({
		schema: graphqlSchema,
		rootValue: graphqlResolvers,
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
		app.listen(8080)
	})
	.catch((err) => console.log(err))
