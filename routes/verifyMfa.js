const express = require("express");
const router = express.Router();
const CookiePreferences = require("../models/CookiePreferences");
const Location = require("../models/Location");

// In-memory MFA store (injected from server.js)
let mfaCodes;

router.post("/", async (req, res) => {
    const { code } = req.body;
    const user = req.user; // From authMiddleware
    const stored = mfaCodes.get(user._id.toString());

    if (!stored) {
        return res.status(400).json({ message: "No code requested or code expired" });
    }

    if (Date.now() > stored.expires) {
        mfaCodes.delete(user._id.toString());
        return res.status(400).json({ message: "Code has expired" });
    }

    if (stored.code !== code) {
        return res.status(400).json({ message: "Invalid code" });
    }

    // MFA verified, delete data using consentId
    try {
        await CookiePreferences.deleteMany({ consentId: stored.consentId });
        await Location.deleteMany({ consentId: stored.consentId });
        mfaCodes.delete(user._id.toString());
        res.status(200).json({ message: "Data deleted successfully" });
    } catch (error) {
        console.error("Error deleting data:", error);
        res.status(500).json({ message: "Failed to delete data" });
    }
});

// Inject mfaCodes from server.js
module.exports = (codes) => {
    mfaCodes = codes;
    return router;
};