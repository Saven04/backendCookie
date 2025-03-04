const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
    consentId: { type: String, required: true },
    action: { type: String, required: true },
    deletedData: { type: Object, required: true },
    timestamp: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
module.exports = AuditLog;
