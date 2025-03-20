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
      required: false, // Optional since geolocation might fail
      default: "unknown"
    },
    city: {
      type: String,
      required: false, // Optional for fallback cases
      default: "unknown"
    },
    country: {
      type: String,
      required: false, // Optional for GDPR jurisdiction fallback
      default: "unknown"
    },
    purpose: {
      type: String,
      enum: ["gdpr-jurisdiction", "consent-logging", "security"],
      required: true,
      default: "consent-logging" // Explicit lawful basis
    },
    consentStatus: {
      type: String,
      enum: ["accepted", "rejected", "not-applicable"],
      required: true,
      default: "not-applicable" // Track user consent
    },
    createdAt: {
      type: Date,
      default: Date.now // Auto-set creation date
    },
    updatedAt: {
      type: Date,
      default: Date.now // Auto-set update date
    },
    deletedAt: {
      type: Date,
      default: null, // Null means not deleted
      index: true // Efficient filtering for soft deletion
    },
    expiresAt: {
      type: Date // For TTL after soft deletion
    }
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

// TTL index for soft-deleted records (90 days after deletion)
locationSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0, // Expire immediately when expiresAt is reached
    partialFilterExpression: { deletedAt: { $exists: true } }, // Only for soft-deleted records
    background: true
  }
);

// Pre-save hook to set expiresAt and update updatedAt
locationSchema.pre("save", function (next) {
  if (this.isModified("deletedAt") && this.deletedAt) {
    this.expiresAt = new Date(this.deletedAt.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from deletion
  }
  if (this.isModified() && !this.isModified("createdAt")) {
    this.updatedAt = new Date(); // Update only if not a new document
  }
  next();
});

// Validate consentStatus aligns with purpose
locationSchema.pre("validate", function (next) {
  if (this.purpose === "consent-logging" && this.consentStatus === "rejected" && !this.deletedAt) {
    next(new Error("Consent-logging purpose requires accepted consent unless soft-deleted"));
  }
  next();
});

// Method to soft delete
locationSchema.methods.softDelete = async function () {
  this.consentStatus = "rejected";
  this.deletedAt = new Date();
  this.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days TTL
  await this.save();
};

// Indexes for efficient queries
locationSchema.index({ consentId: 1, deletedAt: 1 });
locationSchema.index({ isp: 1, createdAt: 1 });

const Location = mongoose.model("Location", locationSchema);
module.exports = Location;