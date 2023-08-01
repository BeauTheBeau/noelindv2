const mongoose = require('mongoose');

const moveSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    damage_level: { type: Number, required: true },
    success_rate: { type: Number, required: true },
    rank: { type: Number, required: true }
});

module.exports = mongoose.model('Move', moveSchema);