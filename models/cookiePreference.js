const mongoose = require("mongoose");
const moment = require("moment-timezone");

const cookiePreferencesSchema = new mongoose.Schema(
  {
    consentId: {
      type: String,
      required: [true, "Consent ID is required."],
      unique: true,
      trim: true,
      ref: "User", // Reference to User model
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

// TTL Index to auto-delete preferences after 2 years (730 days)
cookiePreferencesSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 730 });

// Index for consentId to optimize queries
cookiePreferencesSchema.index({ consentId: 1 });

// Pre-save hook to ensure `consentId` exists in the User collection before saving preferences
cookiePreferencesSchema.pre('save', async function(next) {
  try {
    const user = await mongoose.model("User").findOne({ consentId: this.consentId });
    if (!user) {
      throw new Error("Consent ID not found in User model.");
    }
    next();
  } catch (error) {
    next(error);
  }
});

const CookiePreference = mongoose.model("CookiePreference", cookiePreferencesSchema);
module.exports = CookiePreference;
