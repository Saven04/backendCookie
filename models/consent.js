const mongoose = require("mongoose");

const consentSchema = new mongoose.Schema({
    consentId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    preferences: {
        strictlyNecessary: { type: Boolean, default: true },
        performance: { type: Boolean, default: false },
        functional: { type: Boolean, default: false },
        advertising: { type: Boolean, default: false },
        socialMedia: { type: Boolean, default: false },
    },
    locationData: {
        ipAddress: { type: String, default: "Unknown" },
        isp: { type: String, default: "Unknown" },
        city: { type: String, default: "Unknown" },
        country: { type: String, default: "Unknown" },
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Middleware to update the `updatedAt` field before saving
consentSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});

module.exports = mongoose.model("Consent", consentSchema);