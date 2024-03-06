const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema({
    camID: String,
    ip: String,
    user : String,
    password : String
});

module.exports = mongoose.model('camera', cameraSchema)