const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const isOnline = require('is-online');

// import models
const { User } = require("../db/models/User");

// import utilities
const { encrypt, decrypter } = require('../utility/aes');
const { createToken } = require('../utility/jwt');
const mailer = require('../utility/mailer');
const {
	registerValidationRules,
	resetPassValidationRules,
	resetKeyValidationRules,
	validate
} = require("../utility/validator");
const { validationResult } = require('express-validator');

// error messages
const ERR_SERVER_ERROR = "Internal Server Error.";
const ERR_DUPLICATE = "Already Exists."


module.exports = (io) => {

	// TODO: Create api for fetching data of all users (to be used rendering list of accounts in the admin page)
	// Assigned Person: Michael Ong
	// Method: GET
	// Route: /api/users/
	// Description: get all user data except for sensitive information (i.e. password)


	

	/* ---------------------------------------------------------------------------------------------------------------------
	Route:
	POST /api/users/enroll

	Description:
	This route is for registering new users or accounts for Emmy

	Author:
	Michael Ong
	----------------------------------------------------------------------------------------------------------------------*/
	router.post('/enroll', registerValidationRules, async (req, res) => {
		try {
			const errors = validationResult(req);

			if(!errors.isEmpty()) {
				return res.status(400).send(errors.errors.map(err => err.msg));
			}

			// Extract user information
			let { email, firstname, lastname, username, password, confirmPassword, isAdmin } = req.body;

			let user = await User.findOne({ email });
			if (user) return res.status(409).send(ERR_DUPLICATE);

			if(confirmPassword !== password) {
				console.error('Confirm password does not match'.red);
				return res.status(400).send('Confirm password does not match.');
			}

			// hash password
			password = bcrypt.hashSync(password);

			// create a new User
			let newUser = new User({
				email    : email,
				firstname: firstname,
				lastname : lastname,
				username : username,
				password : password,
				isAdmin  : isAdmin
			});

			await newUser.save();

			return res.status(200).send(`Successfully registered a new user (${newUser.email})`);

		} catch (error) {
			console.log(error);
			return res.status(500).send(ERR_SERVER_ERROR);
		}
	});



	/*----------------------------------------------------------------------------------------------------------------------
	Route:
	POST /api/user/email-notif
	
	Description:
	This route is used for sending email through the HR manager or users.
	
	Author:
	Michael Ong
	----------------------------------------------------------------------------------------------------------------------*/
	router.post('/email-notif', async (req, res) => {


		const { emailBod, sendToEmail, token } = req.body;
		mailer.sendEmailNotif('mokiong1427@gmail.com', 'Moki@gmail.com', 'hi po');
		res.send('hi')
		// // jwt.verify(token, process.env.JWT_KEY, async (err, payload) => {
		// // 	if(err){
		// // 		res.status(401).send('Unauthorized access')
		// // 	}

		// // 	// look for email in db to get username
		// // 	const user = await User.find({ ema})

		// // })

		// const user = await User.findOne({email : 'mokiasdong1427@gmail.com'})
		// if(user){
		// 	console.log('hi')
		// }
		// console.log(user)
		// res.send(user)


		// mailer.sendEmailNotif(sendToEmail, 'michael', emailBod)
		// res.send('hi');
	})



	/*----------------------------------------------------------------------------------------------------------------------
	Route:
	POST /api/reset-password
	
	Description:
	This is used for handling forgot password requests.
	
	Author:
	Michael Ong
	----------------------------------------------------------------------------------------------------------------------*/
	router.post('/reset-password', resetPassValidationRules, validate, async (req, res) => {
		try {
			const email = req.body.email;

			// check if user has internet access
			const netStatus = await isOnline();

			if (netStatus) {
				const user = await User.findOne({ email: email });
				if (!user) {
					res.send('Email doesnt exist');
				}
				else {

					const username = user.firstname + ' ' + user.lastname
					const decr = user.email;

					// create token with user info ------- 1 min lifespan
					const token = createToken({ email: user.email }, '1m');

					// gets last 7 char in token and makes it the verif key
					const key = token.substring(token.length - 7)

					// send key to user email
					mailer.resetPassMail(decr, username, key);

					// encrypt token before sending to user
					const encTok = encrypt(token);

					res.status(200).send({ resetTok: encTok })
				}
			} else {
				res.status(502).send('Please check your internet connection!');
			}
		} catch (error) {
			console.log(error)
			res.status(500).send('Error on server!')
		}
	});





	/*----------------------------------------------------------------------------------------------------------------------
	Route:
	POST /api/user/reset-password-key
	
	Description:
	This route is used for handling the reset key to access reset password page.
	
	Author:
	Michael Ong
	----------------------------------------------------------------------------------------------------------------------*/
	router.post('/reset-password-key', resetKeyValidationRules, validate, async (req, res) => {
		try {
			const { key, encTok } = req.body;
			const decTok = decrypter(encTok);

			jwt.verify(decTok, process.env.JWT_KEY, async (err, payload) => {

				if (err) {
					res.status(401).send('Invalid');
				} else {
					if (key === decTok.substring(decTok.length - 7)) {
						// if token is not expired and key is correct, proceed to change password page
						res.status(200).send({ user: payload.email })
					} else {
						res.status(400).send('Invalid key');
					}
				}
			})

		} catch (error) {
			console.log(error)
			res.status(500).send('Error on server!')
		}
	});

	return router;
}; 