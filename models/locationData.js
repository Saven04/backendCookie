const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    consentId: {
      type: String,
      required: true,
      index: true // Efficient querying by consentId
    },
    ipAddress: {
      type: String,
      required: true,
      set: function (ip) {
        const anonymizeIp = process.env.ANONYMIZE_IP === "true"; // Configurable via env
        return anonymizeIp && ip ? ip.replace(/\.\d+$/, ".x") : ip; // Anonymize last octet if enabled
      }
    },
    isp: {
      type: String,
      required: true // Retain ISP as required for tracking provider
    },
    city: {
      type: String,
      required: true // Required for GDPR jurisdiction
    },
    country: {
      type: String,
      required: true // Required for GDPR jurisdiction
    },
    latitude: {
      type: Number,
      default: null // Optional, precise location
    },
    longitude: {
      type: Number,
      default: null // Optional, precise location
    },
    createdAt: {
      type: Date,
      default: Date.now // Auto-set creation date
    },
    deletedAt: {
      type: Date,
      default: null, // Null means not deleted
      index: true // Efficient filtering for soft deletion
    },
    purpose: {
      type: String,
      enum: ["gdpr-jurisdiction", "consent-logging", "security"],
      required: true, // Explicit lawful basis
      default: "consent-logging"
    },
    consentStatus: {
      type: String,
      enum: ["accepted", "rejected", "not-applicable"],
      required: true, // Track user consent
      default: "not-applicable"
    }
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

// TTL index for automatic deletion after 90 days (2592000 seconds), only for non-deleted records
locationSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24 * 90, // 90 days
    partialFilterExpression: { deletedAt: null }, // Only expire active records
    background: true
  }
);

// Validate consentStatus aligns with purpose
locationSchema.pre("validate", function (next) {
  if (this.purpose === "consent-logging" && this.consentStatus === "rejected") {
    next(new Error("Consent-logging purpose requires accepted consent"));
  }
  next();
});

// Method to soft delete
locationSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  this.consentStatus = "rejected"; // Update status on deletion
  await this.save();
};

// Index for efficient admin queries
locationSchema.index({ consentId: 1, deletedAt: 1 });
locationSchema.index({ isp: 1, createdAt: 1 }); // Updated to index isp instead of ipProvider

const Location = mongoose.model("Location", locationSchema);
module.exports = Location;