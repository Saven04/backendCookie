const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// User Schema
const UserSchema = new mongoose.Schema(
    {
        username: { 
            type: String, 
            required: true,
            trim: true 
        },
        email: { 
            type: String, 
            required: true, 
            unique: true, 
            lowercase: true // Ensures uniqueness regardless of case
        },
        password: { 
            type: String, 
            required: true 
        }, // Passwords should be securely hashed

        consentId: { 
            type: String, 
            unique: true, 
            required: true, 
            default: () => `CID-${crypto.randomUUID().split('-')[0]}` // Generates CID-XXXX format
        }, // Auto-generated unique consent ID

        lastActive: { 
            type: Date, 
            default: Date.now 
        }, // Tracks last login or activity
        deletedAt: { 
            type: Date, 
            default: null 
        } // Used for soft deletion
    },
    { timestamps: true }
);

// **TTL Index for Auto-Deleting Inactive Users (1 Year)**
UserSchema.index({ lastActive: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 }); // 1 year

// **TTL Index for Auto-Deleting User Data After Account Deletion (1 Year)**
UserSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365, partialFilterExpression: { deletedAt: { $exists: true } } }); 

// **Hash Password Before Storing**
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10); // Hash password with bcrypt
    next();
});

// **Mask PII on API Responses**
UserSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password; // Remove password from API response
    obj.email = "**********"; // Mask email in API responses
    return obj;
};

const User = mongoose.model("User", UserSchema);
module.exports = User;
