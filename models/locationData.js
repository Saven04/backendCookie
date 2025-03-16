const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    consentId: {
      type: String,
      required: true,
      index: true // Efficient querying for deletion by consentId
    },
    ipAddress: {
      type: String,
      required: true,
      set: function (ip) {
    
        const anonymizeIp = process.env.ANONYMIZE_IP === "true"; // Configurable via env
        return anonymizeIp && ip ? ip.replace(/\.\d+$/, ".x") : ip;
      }
    },
    country: {
      type: String,
      required: true // Sufficient for GDPR jurisdiction check
    },
    region: {
      type: String,
      default: null // Optional, coarse location
    },
    createdAt: {
      type: Date,
      default: Date.now // Auto-set creation date
    },
    purpose: {
      type: String,
      enum: ["gdpr-jurisdiction", "consent-logging", "security"],
      required: true // Explicit lawful basis
    },
    consentStatus: {
      type: String,
      enum: ["accepted", "rejected", "not-applicable"],
      required: true // Track user consent
    }
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

// TTL index for automatic deletion after 90 days (2592000 seconds)
locationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90, background: true }
);

// Optional: Validate purpose aligns with consentStatus
locationSchema.pre("validate", function (next) {
  if (this.purpose === "consent-logging" && this.consentStatus === "rejected") {
    next(new Error("Consent-logging purpose requires accepted consent"));
  }
  next();
});

const Location = mongoose.model("Location", locationSchema);
module.exports = Location;