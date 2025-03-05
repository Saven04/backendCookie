const mongoose = require("mongoose");

const consentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Link to User
    consentId: { type: String, required: true, unique: true }, // Unique consent ID
    preferences: {
        strictlyNecessary: { type: Boolean, required: true },
        performance: { type: Boolean, required: true },
        functional: { type: Boolean, required: true },
        advertising: { type: Boolean, required: true },
        socialMedia: { type: Boolean, required: true },
    },
    locationData: {
        ipAddress: String,
        isp: String,
        city: String,
        country: String,
        latitude: Number,
        longitude: Number,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Consent", consentSchema);