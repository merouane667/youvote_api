const mongoose = require('mongoose');

// Candidate Schema
const candidateSchema = new mongoose.Schema({
    name: String,
    party: String,
    election: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });
  
const Candidate = mongoose.model('Candidate', candidateSchema);
  

module.exports = Candidate;