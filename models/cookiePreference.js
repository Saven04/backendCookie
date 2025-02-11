const mongoose = require("mongoose");
const moment = require("moment-timezone");

// Define schema for storing user cookie preferences
const cookiePreferencesSchema = new mongoose.Schema(
  {
    consentId: {
      type: String,
      required: [true, "Consent ID is required."],
      unique: true,
      trim: true,
    },
    preferences: {
      type: Object,
      required: true,
      default: {
        strictlyNecessary: true,
        performance: false,
        functional: false,
        advertising: false,
        socialMedia: false,
      },
    },
    createdAt: {
      type: Date,
      default: () => moment().tz("Asia/Kolkata").toDate(), // Save in IST
      expires: 365 * 24 * 60 * 60, // Auto-delete after 365 days
    },
  },
  {
    timestamps: true, // Enables createdAt & updatedAt
  }
);

// Convert timestamps to IST when returning JSON responses
cookiePreferencesSchema.set("toJSON", {
  transform: function (doc, ret) {
    ret.createdAt = moment(ret.createdAt).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    ret.updatedAt = moment(ret.updatedAt).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
    return ret;
  },
});

// Create Mongoose model
const CookiePreferences = mongoose.model("CookiePreferences", cookiePreferencesSchema);

module.exports = CookiePreferences;
