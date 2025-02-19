const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    consentId: { 
      type: String, 
      required: [true, "Consent ID is required."],
      unique: true,
      ref: "User", // Reference to User model
    },
    ipAddress: { type: String, required: [true, "IP Address is required."] },
    isp: { type: String, required: [true, "ISP is required."] },
    city: { type: String, required: [true, "City is required."] },
    country: { type: String, required: [true, "Country is required."] },
    latitude: { type: Number },
    longitude: { type: Number },
    createdAt: { 
      type: Date, 
      default: Date.now, 
      expires: 60 * 60 * 24 * 90 // Auto-delete after 90 days
    },
  },
  { 
    timestamps: true 
  }
);

// Ensure TTL Index for auto-deletion after 90 days
locationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

// Index for consentId to optimize queries
locationSchema.index({ consentId: 1 });

// Pre-save hook to ensure `consentId` exists in the User collection before saving location data
locationSchema.pre('save', async function(next) {
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

const Location = mongoose.model("Location", locationSchema);
module.exports = Location;
