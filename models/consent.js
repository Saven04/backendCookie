const mongoose = require("mongoose");

const ConsentSchema = new mongoose.Schema({
  consentId: { type: String, required: true, unique: true },
  preferences: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Consent", ConsentSchema);
