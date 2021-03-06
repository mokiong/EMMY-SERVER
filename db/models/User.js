const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = Schema({
   email: {
      type: String,
      unique: true,
      required: true
   },
   firstname: {
      type: String,
      required: true
   },
   lastname: {
      type: String,
      required: true
   },
   username: {
		type: String,
		unique: true,
      required: true
   },
   password: {
      type: String,
      required: true
   },
   isAdmin: {
      type: Boolean,
      required: true,
      default: false
	},
	photo: {
		type: String,
		default: null,
   }
});

const User = mongoose.model('User', UserSchema);

module.exports = {
   UserSchema,
   User
}