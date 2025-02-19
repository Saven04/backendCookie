const mongoose = require("mongoose");
const crypto = require("crypto");

// Function to hash email before storing (for anonymization)
function hashEmail(email) {
    return crypto.createHash("sha256").update(email).digest("hex");
}

// Function to generate a unique consentId (using random bytes for uniqueness)
function generateConsentId() {
    return crypto.randomBytes(16).toString("hex"); // Generate a unique consentId (16-byte hex string)
}

const UserSchema = new mongoose.Schema(
  {
    username: { 
      type: String, 
      required: [true, "Username is required"], 
      trim: true, 
      maxlength: [30, "Username must be at most 30 characters long"] 
    },
    email: { 
      type: String, 
      required: [true, "Email is required"], 
      unique: true, 
      set: hashEmail, // Store hashed email
      validate: {
        validator: function(v) {
          // Simple email validation regex; consider a more robust one for production
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: props => `${props.value} is not a valid email address!`
      }
    },
    password: { 
      type: String, 
      required: [true, "Password is required"], 
      minlength: [8, "Password must be at least 8 characters long"]
    }, // Use bcrypt hashing before storing
    consentId: { 
      type: String, 
      required: true, 
      unique: true, 
      default: generateConsentId 
    }, // Unique consentId

    lastActive: { 
      type: Date, 
      default: Date.now 
    }, // Tracks last activity
    deletedAt: { 
      type: Date, 
      default: null 
    }, // Marks account for deletion
  },
  { 
    timestamps: true 
  }
);

// TTL Index for Auto-Deleting Inactive Users (1 Year)
UserSchema.index({ lastActive: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 }); // 1 year

// TTL Index for Auto-Deleting User Data After Account Deletion (1 Year)
UserSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

// Mask PII on API Responses
UserSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password; // Remove password from API response
    obj.email = obj.email ? "**********" : null; // Mask email
    return obj;
};

// Middleware to update `lastActive` on any find/update operation
UserSchema.pre('findOne', updateLastActive);
UserSchema.pre('findOneAndUpdate', updateLastActive);

function updateLastActive(next) {
    this.findOneAndUpdate({}, { $set: { lastActive: new Date() } });
    next();
}

const User = mongoose.model("User", UserSchema);
module.exports = User;
