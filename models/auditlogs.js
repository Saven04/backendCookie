const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ["login", "logout", "soft-delete", "data-fetch", "other"] // Define allowed actions
    },
    consentId: {
        type: String, // Relevant for actions like soft-delete
        default: null
    },
    details: {
        type: String, // Additional context (e.g., "Fetched all GDPR data")
        default: ""
    },
    ipAddress: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("AuditLog", auditLogSchema);