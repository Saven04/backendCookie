const mongoose = require("mongoose");
const crypto = require("crypto");

// Function to hash sensitive data (email/phone)
function hashData(data) {
    return data ? crypto.createHash("sha256").update(data).digest("hex") : null;
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
        set: hashData // Hash email for privacy
    },
    phone: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        set: function (phone) {
            console.log("Raw Phone Input:", phone); // Debugging log
            return phone ? hashData(phone) : null;
        }
    },
    
    password: { 
        type: String, 
        required: true 
    }, // Use bcrypt hashing before storing

    consentId: { 
        type: String, 
        unique: true, 
        required: true, 
        default: () => crypto.randomUUID() // Generate a unique consentId by default
    }, // Link user with cookie consent data

    lastActive: { 
        type: Date, 
        default: Date.now 
    }, // Tracks last activity
    deletedAt: { 
        type: Date, 
        default: null 
    }, // Marks account for deletion
  },
  { timestamps: true }
);

// **TTL Index for Auto-Deleting Inactive Users (1 Year)**
UserSchema.index({ lastActive: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

// **TTL Index for Auto-Deleting User Data After Account Deletion (1 Year)**
UserSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

// **Mask PII on API Responses**
UserSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password; // Remove password from API response
    obj.email = obj.email ? "**********" : null; // Mask email
    obj.phone = obj.phone ? "**********" : null; // Mask phone number
    obj.consentId = obj.consentId ? "**********" : null; // Mask consentId in API responses
    return obj;
};

// **Drop the Old Index to Apply Fix**
(async () => {
    try {
        await mongoose.connection.collection("users").dropIndex("phone_1"); // Drop old index
    } catch (err) {
        if (err.codeName !== "IndexNotFound") console.error("Index drop error:", err);
    }
})();

const User = mongoose.model("User", UserSchema);
module.exports = User;
