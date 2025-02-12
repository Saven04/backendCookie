const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
    {
        consentId: { type: String, required: true },
        ipAddress: { type: String, required: true }, // Stores Anonymized IP
        isp: { type: String },
        city: { type: String },
        region: { type: String },
        country: { type: String },
        latitude: { type: Number },
        longitude: { type: Number },
        postalCode: { type: String },
        timezone: { type: String },
        createdAt: { type: Date, default: Date.now, expires: "365d" }, // Auto-delete after 1 year
    },
    { timestamps: true }
);

const LocationData = mongoose.model("LocationData", locationSchema);
module.exports = LocationData;
