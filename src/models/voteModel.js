const mongoose = require('mongoose');

// Vote Schema
const voteSchema = new mongoose.Schema({
    user: String,
    encryptedVote: String,
    iv: String // Ajouter un champ pour l'IV
});

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;
