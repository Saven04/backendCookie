// models/User.js
const mongoose = require("mongoose");
const crypto = require("crypto");
const { encrypt, decrypt } = require("simple-encryptor")(process.env.ENCRYPTION_KEY); // Example encryption

function hashEmail(email) {
    return crypto.createHash("sha256").update(email).digest("hex");
}

const UserSchema = new mongoose.Schema(
    {
        username: { type: String, required: true },
        email: { type: String, required: true, unique: true, set: hashEmail }, // Hashed email
        rawEmail: { type: String, required: true, set: v => encrypt(v), get: v => decrypt(v) }, // Encrypted raw email
        password: { type: String, required: true },
        consentId: { type: String, unique: true, required: true, default: () => crypto.randomUUID() },
        lastActive: { type: Date, default: Date.now },
        deletedAt: { type: Date, default: null }
    },
    { timestamps: true, toJSON: { getters: true } }
);

UserSchema.index({ lastActive: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });
UserSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

UserSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    obj.email = "**********";
    obj.consentId = "**********";
    delete obj.rawEmail; // Never expose rawEmail in API responses
    return obj;
};

module.exports = mongoose.model("User", UserSchema);