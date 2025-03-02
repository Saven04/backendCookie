const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },  // Identifier for the counter (e.g., "consentId")
  seq: { type: Number, default: 0 },      // Auto-incrementing sequence number
});

const Counter = mongoose.model("Counter", counterSchema);
module.exports = Counter;
