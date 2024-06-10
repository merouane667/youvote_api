const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { secretKey } = require('../config');
const { v4: uuidv4 } = require('uuid');

//nodemailer
const nodemailer = require('nodemailer');
//vonage
const { Vonage } = require('@vonage/server-sdk');


// Configure the transporter for Gmail
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'youvote7@gmail.com',
    pass: 'rkwx gatx akot myxd',
  },
});

// Set up Vonage
const vonage = new Vonage({
  apiKey: "30311db1",
  apiSecret: "f2kTHwjQ1D7ErTpI"
})

exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber } = req.body;
    const emailCode = uuidv4().slice(0, 6);
    const phoneCode = uuidv4().slice(0, 6);

    // Check for empty fields
    if (!firstName || !lastName || !email || !phoneNumber) {
      return res.status(400).json({ error: 'All fields must be filled out.' });
    }

    // Custom validation for firstName
    if (!/^[a-zA-Z]+$/.test(firstName)) {
      return res.status(400).json({ error: 'First name must only contain alphabetical characters.' });
    }

    // Custom validation for lastName
    if (!/^[a-zA-Z]+$/.test(lastName)) {
      return res.status(400).json({ error: 'Last name must only contain alphabetical characters.' });
    }

    // Custom validation for email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    // Check for unique email and phoneNumber
    const isEmailUnique = await User.findOne({ email });
    const isPhoneNumberUnique = await User.findOne({ phoneNumber });

    if (isEmailUnique) {
      return res.status(400).json({ error: 'Email is already in use.' });
    }

    if (isPhoneNumberUnique) {
      return res.status(400).json({ error: 'Phone number is already in use.' });
    }

    const user = new User({
      firstName,
      lastName,
      email,
      phoneNumber,
      emailVerified: false,
      phoneVerified: false,
      emailVerificationCode: emailCode,
      phoneVerificationCode: phoneCode,
    });

    await user.save();

    // Send verification email
    const mailOptions = {
      from: 'youvote7@gmail.com',
      to: email,
      subject: 'Email Verification Code',
      text: `Welcome to YouVote, ${firstName} ${lastName}!\n\nThank you for registering on our platform. To complete your registration, please verify your email address by entering the following verification code in the app:\n\nVerification Code: ${emailCode}\n\nIf you did not request this code, please ignore this email.\n\nBest regards,\nThe YouVote Team`,
    };

    transporter.sendMail(mailOptions);

    // Send verification SMS
    // const from = "YouVote"
    // const to = phoneNumber
    // const text = `Your verification code is: ${phoneCode}\n\n`

    // async function sendSMS() {
    //     await vonage.sms.send({to, from, text})
    //         .then(resp => { console.log('Message sent successfully'); console.log(resp); })
    //         .catch(err => { console.log('There was an error sending the messages.'); console.error(err); });
    // }

    // sendSMS();

    res.status(201).json({ message: 'User registered successfully. Verification codes sent to email and phone.' });
    } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
    }
  };

// Verification endpoint
exports.verify = async (req, res) => {
  try {
    const { email, emailCode, phoneCode } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerificationCode === emailCode && user.phoneVerificationCode === phoneCode) {
      user.emailVerified = true;
      user.phoneVerified = true;
      await user.save();

      res.status(200).json({ message: 'Email and phone number verified successfully.' });
    } else {
      res.status(400).json({ error: 'Invalid verification codes' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.emailVerified || !user.phoneVerified) {
      return res.status(403).json({ error: 'Email and phone number not verified' });
    }

    const loginId = uuidv4().slice(0, 18);
    const loginPassword = uuidv4().slice(0, 8);

    // Save the login ID and password temporarily
    user.loginId = loginId;
    user.loginPassword = loginPassword;
    await user.save();

    // Send login ID and password to email
    const mailOptions = {
      from: 'youvote7@gmail.com',
      to: email,
      subject: 'Login ID and Password',
      text: `Your login ID is:\n\n${loginId}\n\nand your password is:\n\n${loginPassword}\n\n`,
    };

    transporter.sendMail(mailOptions);

    // Send login ID and password to phone
    // const from = "YouVote"
    // const to = user.phoneNumber
    // const text = `Your login ID is:\n\n${loginId}\n\nand your password is:\n\n${loginPassword}\n\n`

    // async function sendSMS() {
    //     await vonage.sms.send({to, from, text})
    //         .then(resp => { console.log('Message sent successfully'); console.log(resp); })
    //         .catch(err => { console.log('There was an error sending the messages.'); console.error(err); });
    // }

    // sendSMS();

    res.status(200).json({ message: 'Login ID and password sent to email and phone' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Endpoint to validate login ID and password
exports.validateLogin = async (req, res) => {
  try {
    const { email, loginId, loginPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.loginId === loginId && user.loginPassword === loginPassword) {
      // Generate a JWT token
      const token = jwt.sign({ email: user.email }, secretKey, { expiresIn: '1h' });

      // Clear temporary login credentials
      user.loginId = undefined;
      user.loginPassword = undefined;
      await user.save();

      res.status(200).json({ message: 'Login successful', user, token });
    } else {
      res.status(400).json({ error: 'Invalid login ID or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};