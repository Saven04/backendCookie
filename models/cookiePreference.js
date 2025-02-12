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
      type: Date, // Store as Date (MongoDB default)
      default: () => moment().tz("Asia/Kolkata").toDate(), // Convert to IST before saving
    },
  },
  {
    timestamps: true, // Enables createdAt & updatedAt
  }
);

// Convert timestamps to IST in API responses
cookiePreferencesSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.timestamp = moment(obj.timestamp).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
  obj.createdAt = moment(obj.createdAt).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
  obj.updatedAt = moment(obj.updatedAt).tz("Asia/Kolkata").format("YYYY-MM-DD HH:mm:ss");
  return obj;
};

// Create the Mongoose model
const CookiePreferences = mongoose.model("CookiePreferences", cookiePreferencesSchema);

// Export the model
module.exports = CookiePreferences;
