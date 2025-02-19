const mongoose = require("mongoose");
const moment = require("moment-timezone");

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
    createdAt: {
      type: Date,
      default: () => moment().tz("Asia/Kolkata").toDate(), 
      expires: 60 * 60 * 24 * 730, // Auto-delete after 2 years (730 days)
    },
  },
  {
    timestamps: true,
  }
);

// Ensure TTL Index is created
cookiePreferencesSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 730 });

const CookiePreferences = mongoose.model("CookiePreferences", cookiePreferencesSchema);
module.exports = CookiePreferences;
