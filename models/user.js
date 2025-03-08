// models/User.js
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcryptjs"); // Changed from bcrypt to bcryptjs

function hashEmail(email) {
    return crypto.createHash("sha256").update(email).digest("hex");
}

const UserSchema = new mongoose.Schema(
    {
        username: { type: String, required: true },
        email: { type: String, required: true, unique: true, set: hashEmail },
        password: { type: String, required: true },
        consentId: { type: String, unique: true, required: true },
        lastActive: { type: Date, default: Date.now },
        deletedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

UserSchema.pre("save", async function(next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10); // bcryptjs works the same
    }
    next();
});

UserSchema.index({ lastActive: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });
UserSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

UserSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    obj.email = "**********";
    obj.consentId = "**********";
    return obj;
};

module.exports = mongoose.model("User", UserSchema);