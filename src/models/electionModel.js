const mongoose = require('mongoose');

// Election Schema
const electionSchema = new mongoose.Schema({
  title: String,
  description: String,
  startDate: Date,
  endDate: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Election = mongoose.model('Election', electionSchema);

module.exports = Election;