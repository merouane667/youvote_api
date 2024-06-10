const jwt = require('jsonwebtoken');
const { secretKey } = require('../config');
const Candidate = require('../models/candidateModel');
const User = require('../models/userModel'); // Import User model

// Controller for getting all candidates of a specific election
exports.getCandidatesByElection = async (req, res) => {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access denied, token missing' });
    }
    
    jwt.verify(token, secretKey);

    const { electionId } = req.params;
    const candidates = await Candidate.find({ election: electionId });

    res.status(200).json(candidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a specific candidate by ID
exports.getCandidateById = async (req, res) => {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access denied, token missing' });
    }
    
    jwt.verify(token, secretKey);

    const { id } = req.params;
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.status(200).json(candidate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller for adding a candidate to an election
exports.addCandidateToElection = async (req, res) => {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access denied, token missing' });
    }

    const decoded = jwt.verify(token, secretKey);
    
    // Find user by decoded email
    const user = await User.findOne({ email: decoded.email });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied, admins only' });
    }

    const { electionId } = req.params;
    const { name, party } = req.body;

    const newCandidate = new Candidate({
      name,
      party,
      election: electionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newCandidate.save();
    res.status(201).json({ message: 'Candidate added successfully', candidate: newCandidate });
  } catch (error) {
    res.status  .json({ error: 'Internal server error' });
  }
};

// Controller for updating a candidate of a specific election
exports.updateCandidateInElection = async (req, res) => {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access denied, token missing' });
    }

    const decoded = jwt.verify(token, secretKey);
    
    // Find user by decoded email
    const user = await User.findOne({ email: decoded.email });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied, admins only' });
    }

    const { electionId, candidateId } = req.params;
    const { name, party } = req.body;

    const candidate = await Candidate.findOne({ _id: candidateId, election: electionId });
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    candidate.name = name || candidate.name;
    candidate.party = party || candidate.party;
    candidate.updatedAt = new Date();

    await candidate.save();
    res.status(200).json({ message: 'Candidate updated successfully', candidate });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller for deleting a candidate from a specific election
exports.deleteCandidateFromElection = async (req, res) => {
  try {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Access denied, token missing' });
    }

    const decoded = jwt.verify(token, secretKey);
    
    // Find user by decoded email
    const user = await User.findOne({ email: decoded.email });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied, admins only' });
    }

    const { electionId, candidateId } = req.params;

    const candidate = await Candidate.findOneAndDelete({ _id: candidateId, election: electionId });
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.status(200).json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
