const mongoose = require("mongoose");
const moment = require("moment-timezone");

const locationSchema = new mongoose.Schema(
  {
    consentId: { type: String, required: true },
    ipAddress: { type: String, required: true }, // ✅ Stores only anonymized IPs
    isp: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    createdAt: {
      type: Date,
      default: () => moment().tz("Asia/Kolkata").toDate(),
    },
  },
  { timestamps: true }
);

const LocationData = mongoose.model("LocationData", locationSchema);
module.exports = LocationData;
