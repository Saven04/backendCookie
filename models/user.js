const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    sessionId: { type: String, unique: true, sparse: true }, // Unique session ID
});

module.exports = mongoose.model("User", userSchema);