const jwt = require('jsonwebtoken');
const { privateKey1, privateKey2, secretKey } = require('../config');
const Vote = require('../models/voteModel');
const User = require('../models/userModel');
const Election = require('../models/electionModel'); // Assuming you have an election model
const mongoose = require('mongoose');
const crypto = require('crypto');

// Helper function to create a composite key from two private keys
function createCompositeKey(key1, key2) {
  if (!key1 || !key2) {
    throw new Error('Private keys must be defined');
  }

  // Concatenate the two keys and generate a composite key using SHA-256
  const compositeKey = crypto.createHash('sha256').update(key1 + key2).digest('hex');
  return compositeKey.slice(0, 64); // 64 hexadecimal characters = 32 bytes = 256 bits
}

// Helper function to encrypt data with a given key
function encryptWithKey(data, key) {
  const iv = crypto.randomBytes(16); // Generate a random IV for each encryption operation
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { encryptedData: encrypted, iv: iv.toString('hex') };
}

// Helper function to decrypt data with a given key
function decryptWithKey(encryptedData, key, iv) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Controller for submitting a vote
exports.vote = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ error: 'Access denied, token missing' });
    }

    const decoded = jwt.verify(token, secretKey);
    const userEmail = decoded.email;

    // Check if the user is an admin
    const user = await User.findOne({ email: userEmail }).session(session);
    if (user.role === 'admin') {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ error: 'Admins are not allowed to vote' });
    }

    // Extract vote details from request body
    const { election, candidate } = req.body;

    // Fetch the election details
    const electionDetails = await Election.findById(election).session(session);
    if (!electionDetails) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ error: 'Election not found' });
    }

    const currentTime = new Date();
    const electionStart = new Date(electionDetails.startDate);
    const electionEnd = new Date(electionDetails.endDate);

    // Check if the election has not started yet or has ended
    if (currentTime < electionStart) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Election has not started yet' });
    }

    if (currentTime > electionEnd) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ error: 'Election has ended' });
    }

    // Create a composite key from the two private keys
    const compositeKey = createCompositeKey(privateKey1, privateKey2);

    // Check if the user has already voted for the specified election
    const votes = await Vote.find({ user: userEmail }).session(session);
    for (const vote of votes) {
      const decryptedVote = decryptWithKey(vote.encryptedVote, compositeKey, vote.iv);
      const { election: existingElection } = JSON.parse(decryptedVote);
      if (existingElection === election) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: 'You have already voted for this election' });
      }
    }

    // Create the vote data
    const voteData = JSON.stringify({ user: userEmail, election, candidate });

    // Encrypt the vote data with the composite key
    const { encryptedData, iv } = encryptWithKey(voteData, compositeKey);

    // Create a new vote object with the encrypted data and IV
    const vote = new Vote({
      user: userEmail,
      encryptedVote: encryptedData,
      iv: iv, // Store the IV used for later decryption
    });

    // Save the vote to the database
    await vote.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Send response
    res.status(201).json({ message: 'Vote made successfully', vote });
  } catch (error) {
    // Abort the transaction in case of an error
    await session.abortTransaction();
    session.endSession();

    console.error(error); // Log the error for debugging
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller for getting all decrypted votes made by the user
exports.getMyVotes = async (req, res) => {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access denied, token missing' });
    }

    const decoded = jwt.verify(token, secretKey);
    const userEmail = decoded.email;

    // Create a composite key from the two private keys
    const compositeKey = createCompositeKey(privateKey1, privateKey2);

    // Fetch the votes made by the user
    const votes = await Vote.find({ user: userEmail });

    // Decrypt the votes
    const decryptedVotes = votes.map((vote) => {
      const decryptedVote = decryptWithKey(vote.encryptedVote, compositeKey, vote.iv);
      return JSON.parse(decryptedVote);
    });

    res.status(200).json(decryptedVotes);
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ error: 'Internal server error' });
  }
};