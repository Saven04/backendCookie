const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    consentId: { type: String, required: true },
    ipAddress: { type: String, required: true },
    isp: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    createdAt: { type: Date, default: Date.now, expires: "30d" }, // ⏳ Auto-delete after 30 days
  },
  { timestamps: true }
);

const Location = mongoose.model("Location", locationSchema);

module.exports = Location;
