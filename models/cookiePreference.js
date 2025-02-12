const mongoose = require("mongoose");
const moment = require("moment-timezone");

// Define the schema for cookie preferences
const cookiePreferencesSchema = new mongoose.Schema(
  {
    consentId: {
      type: String,
      required: [true, "Consent ID is required."],
      unique: true,
      trim: true,
    },
    preferences: {
      strictlyNecessary: { type: Boolean, required: true, default: true },
      performance: { type: Boolean, required: true, default: false },
      functional: { type: Boolean, required: true, default: false },
      advertising: { type: Boolean, required: true, default: false },
      socialMedia: { type: Boolean, required: true, default: false },
    },
    timestamp: {
      type: Date, 
      default: () => moment().tz("Asia/Kolkata").toDate(),
      expires: "730d", // Auto-delete after 2 years (GDPR compliant)
    },
  },
  {
    timestamps: true, // Enables createdAt & updatedAt
  }
);

const CookiePreferences = mongoose.model("CookiePreferences", cookiePreferencesSchema);
module.exports = CookiePreferences;
