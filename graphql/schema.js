const { buildSchema } = require('graphql')

module.exports = buildSchema(`
	
	type Post {
		_id: ID!
		title: String!
		content: String!
		imageUrl: String!
		creator: User!
		createdAt: String!
		updatedAt: String!

	}
	

	type User {
		_id: ID!
		name: String!
		email: String!
		password: String
		status: String!
		posts: [Post!]!
	}


	input UserInputData {
		name: String!
		email: String!
		password: String!

	}

	input postInputData {
		title: String!
		content: String!
		imageUrl: String!

	}

	type loginData {
		token: String!
		userId: String!
	}

	type PostData {
		posts: [Post!]!
		totalPosts: Int!
	}

	type RootQuery {
		login(email: String , password: String): loginData!
		posts(page: Int!): PostData!
	}

	type RootMutation {
		createUser(userInput: UserInputData) : User!
		createPost(postInput: postInputData): Post!
	}

	schema {
		query: RootQuery
		mutation: RootMutation
	}

`)
