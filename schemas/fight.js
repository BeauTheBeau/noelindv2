const mongoose = require('mongoose');
const SchemaTypes = mongoose.Schema.Types;

const
    fightSchema = new mongoose.Schema({
        combatID: {type: String, required: true, unique: true},
        player1: {type: Object, required: true},
        player2: {type: Object, required: true},
        turn: {type: String, required: true},
        winner: {type: String, default: null},
        loser: {type: String, default: null},
        p1hp: {type: Number, default: 100},
        p2hp: {type: Number, default: 100},
        p1mp: {type: Number, default: 100},
        p2mp: {type: Number, default: 100},
        history: {type: Array, default: []},
        p1turn: {type: Boolean, default: true},
        p2turn: {type: Boolean, default: false},
    });

const model = mongoose.model('FightModels', fightSchema);
module.exports = model;