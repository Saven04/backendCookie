const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    consentId: { 
      type: String, 
      required: true, 
      index: true // For efficient querying by consent event
    },
    ipAddress: { 
      type: String, 
      required: true, 
      // Consider anonymizing IPs if full precision isn't needed
      set: function (ip) {
        // Optional: Mask last octet for GDPR data minimization (e.g., 192.168.1.x)
        return ip.replace(/\.\d+$/, ".x"); 
      }
    },
    country: { 
      type: String, 
      required: true // Sufficient for GDPR jurisdiction check
    },
    region: { 
      type: String, 
      default: null // Optional, coarse location for compliance
    },
    createdAt: { 
      type: Date, 
      default: Date.now, 
      expires: 60 * 60 * 24 * 90 // Auto-delete after 90 days (TTL)
    },
    purpose: { 
      type: String, 
      enum: ["gdpr-jurisdiction", "consent-logging", "security"], 
      required: true // Explicitly document the lawful basis
    },
    consentStatus: { 
      type: String, 
      enum: ["accepted", "rejected", "not-applicable"], 
      required: true // Track user consent decision
    }
  },
  { timestamps: true }
);

// TTL index for automatic deletion after 90 days
locationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

// Pre-save hook to ensure compliance with data minimization
locationSchema.pre("save", function (next) {
  // Example: Ensure no unnecessary precision in location data
  if (this.latitude || this.longitude) {
    this.latitude = undefined;
    this.longitude = undefined; // Remove precise geolocation if present
  }
  next();
});

const Location = mongoose.model("Location", locationSchema);
module.exports = Location;