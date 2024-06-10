const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  firstName: String,  
  lastName: String,
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true, unique: true },
  role: { type: String, default: 'user' },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  emailVerificationCode: String,
  phoneVerificationCode: String,
  loginId: String,
  loginPassword: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
