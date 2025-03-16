const mongoose = require("mongoose");

const securityLogSchema = new mongoose.Schema({
    ipAddress: { type: String, required: true },
    timestamp: { type: Date, required: true },
    expiresAt: { type: Date, required: true, expires: 0 } // Auto-delete after 30 days
});

module.exports = mongoose.model("SecurityLog", securityLogSchema);