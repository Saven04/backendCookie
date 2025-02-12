const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
    consentId: { type: String, required: true },
    ipAddress: { type: String, required: true },
    isp: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
});

const Location = mongoose.model("Location", locationSchema);

module.exports = Location;
