const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// MongoDB Models
const User = require("../models/user");
const CookiePreference = require("../models/cookiePreference");
const LocationData = require("../models/locationData");

// ✅ DELETE USER ACCOUNT (With MFA)
router.delete("/delete-user", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email is required." });

        // Find the user in MongoDB
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        // Verify user in Supabase
        const { data, error } = await supabase.auth.admin.deleteUserByEmail(email);
        if (error) return res.status(500).json({ success: false, message: "Supabase error: " + error.message });

        // Delete user from MongoDB collections
        await User.deleteOne({ email });
        await CookiePreference.deleteOne({ email });
        await LocationData.deleteOne({ email });

        return res.json({ success: true, message: "User and all associated data deleted successfully." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
});

// ✅ DELETE COOKIE DATA (Preferences & Location)
router.delete("/delete-cookie-data", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email is required." });

        // Find and delete data from CookiePreference & LocationData collections
        await CookiePreference.deleteOne({ email });
        await LocationData.deleteOne({ email });

        return res.json({ success: true, message: "Cookie preferences and location data deleted successfully." });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error: " + err.message });
    }
});

module.exports = router;
