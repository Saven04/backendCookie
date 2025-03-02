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
      expires: 43200, // Auto-delete after 12 hours (43200 seconds)
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Ensure TTL Index is created for automatic deletion
cookiePreferencesSchema.index({ createdAt: 1 }, { expireAfterSeconds: 43200 });

const CookiePreferences = mongoose.model("CookiePreferences", cookiePreferencesSchema);
module.exports = CookiePreferences;
