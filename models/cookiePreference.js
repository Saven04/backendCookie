const mongoose = require("mongoose");
const moment = require("moment-timezone");

const cookiePreferencesSchema = new mongoose.Schema(
  {
    consentId: {
      type: String,
      required: [true, "Consent ID is required."],
      unique: true,
      trim: true,
      // Reference to User model to ensure this consent is linked to a specific user
      // You can use this field to ensure integrity if you want to link it to a specific User document
      ref: "User", 
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

// **TTL Index to auto-delete preferences after 2 years (730 days)**
cookiePreferencesSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 730 });

// Optional: Add pre-save hook to ensure `consentId` exists in the User collection before saving preferences
cookiePreferencesSchema.pre('save', async function(next) {
  const user = await mongoose.model("User").findOne({ consentId: this.consentId });
  if (!user) {
    const error = new Error("Consent ID not found in User model.");
    next(error);  // Stop save if consentId does not exist in the User model
  } else {
    next(); // Proceed with save if consentId is valid
  }
});

const CookiePreferences = mongoose.model("CookiePreferences", cookiePreferencesSchema);
module.exports = CookiePreferences;
