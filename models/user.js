// models/user.js
const mongoose = require("mongoose");
const crypto = require("crypto");

// Function to hash email before storing
function hashEmail(email) {
    return crypto.createHash("sha256").update(email).digest("hex");
}

const UserSchema = new mongoose.Schema(
    {
        username: { 
            type: String, 
            required: true 
        },
        email: { 
            type: String, 
            required: true, 
            unique: true, 
            set: hashEmail // Store hashed email
        },
        password: { 
            type: String, 
            required: true 
        }, // Assumes bcrypt hashing in your auth logic
        consentId: { 
            type: String, 
            unique: true, 
            required: true, 
            default: () => crypto.randomUUID() 
        },
        profilePic: { 
            type: String, 
            default: null 
        }, // Added for profile picture
        lastActive: { 
            type: Date, 
            default: Date.now 
        },
        deletedAt: { 
            type: Date, 
            default: null 
        }
    },
    { timestamps: true }
);

// TTL Indexes
UserSchema.index({ lastActive: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 }); // 1 year
UserSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

// Mask PII in API responses
UserSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password; // Remove password
    obj.email = obj.email ? "**********" : null; // Mask email
    obj.consentId = obj.consentId ? "**********" : null; // Mask consentId
    return obj;
};

const User = mongoose.model("User", UserSchema);
module.exports = User;