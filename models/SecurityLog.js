const mongoose = require("mongoose");

const securityLogSchema = new mongoose.Schema({
    ipAddress: {
        type: String,
        required: true,
        set: function (ip) {
            // Optional anonymization for GDPR minimization, configurable
            const anonymizeIp = process.env.ANONYMIZE_IP === "true";
            return anonymizeIp && ip ? ip.replace(/\.\d+$/, ".x") : ip;
        }
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true,
        expires: 0 // Auto-delete after TTL
    }
});

// TTL index: expire after 30 days (2592000 seconds)
securityLogSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 } // Use expiresAt field for TTL
);

// Pre-save hook to set expiresAt to 30 days from timestamp
securityLogSchema.pre("save", function (next) {
    if (!this.expiresAt) {
        this.expiresAt = new Date(this.timestamp.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
    next();
});

const SecurityLog = mongoose.model("SecurityLog", securityLogSchema);
module.exports = SecurityLog;