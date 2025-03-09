// models/user.js
const mongoose = require("mongoose");
const crypto = require("crypto");

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
            set: hashEmail // Hashed for storage
        },
        displayEmail: { // New field for readable email
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        password: { 
            type: String, 
            required: true 
        },
        consentId: { 
            type: String, 
            unique: true, 
            required: true, 
            default: () => crypto.randomUUID() 
        },
        profilePic: { 
            type: String, 
            default: null 
        },
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
UserSchema.index({ lastActive: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });
UserSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

// Mask PII in API responses (optional, adjust as needed)
UserSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    obj.email = obj.email; // Keep hashed email as-is
    obj.consentId = "**********"; // Mask consentId
    return obj;
};

const User = mongoose.model("User", UserSchema);
module.exports = User;