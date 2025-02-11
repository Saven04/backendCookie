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
    ipAddress: { type: String, required: true }, // Store IP address for logging
    createdAt: {
      type: Date,
      default: () => moment().tz("Asia/Kolkata").toDate(), // Store timestamp in IST
      expires: "365d", // Auto-delete after 365 days
    },
  },
  {
    timestamps: true, // Enables createdAt & updatedAt
  }
);

// Convert timestamps to IST in API responses
cookiePreferencesSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.createdAt = moment(obj.createdAt).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
  obj.updatedAt = moment(obj.updatedAt).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
  return obj;
};

// Create the Mongoose model
const CookiePreferences = mongoose.model("CookiePreferences", cookiePreferencesSchema);

// Export the model
module.exports = CookiePreferences;
