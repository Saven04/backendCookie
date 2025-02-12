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
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 }, // Auto-delete after 90 days
  },
  { timestamps: true }
);

// Ensure TTL Index is created
locationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

const Location = mongoose.model("Location", locationSchema);
module.exports = Location;
