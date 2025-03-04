const express = require("express");
const router = express.Router();
const User = require("../models/user");
const CookiePreferences = require("../models/cookiePreference");
const Location = require("../models/locationData");
const AuditLog = require("../models/auditLog");
const { verifyMfa } = require("../utils/mfa");
const { sendDeletionConfirmation } = require("../utils/email"); // Email confirmation function

// ✅ DELETE USER DATA (GDPR COMPLIANT)
router.delete("/delete-data", async (req, res) => {
    const { consentId, mfaCode, method } = req.body; // Accepts 'method' (email/sms)

    if (!consentId || !mfaCode || !method) {
        return res.status(400).json({ error: "Consent ID, MFA code, and method are required." });
    }

    try {
        // ✅ Step 1: Verify MFA Before Proceeding
        const isMfaValid = await verifyMfa(consentId, mfaCode, method);
        if (!isMfaValid) {
            return res.status(401).json({ error: "Invalid MFA code." });
        }

        // ✅ Step 2: Fetch Data Before Deletion (For Audit Log)
        const user = await User.findOne({ consentId });
        const cookieData = await CookiePreferences.findOne({ consentId });
        const locationData = await Location.findOne({ consentId });

        if (!user && !cookieData && !locationData) {
            return res.status(404).json({ message: "No personal data found under this consent ID. If you believe this is an error, contact support." });
        }

        // ✅ Step 3: Store an Audit Log (For Compliance)
        await AuditLog.create({
            consentId,
            action: "User Data Deletion",
            deletedData: { 
                user: user ? { email: user.email, username: user.username } : null,
                cookiePreferences: cookieData, 
                locationData: locationData 
            },
            timestamp: new Date()
        });

        // ✅ Step 4: Delete User Data
        if (user) await User.deleteOne({ consentId });
        if (cookieData) await CookiePreferences.deleteOne({ consentId });
        if (locationData) await Location.deleteOne({ consentId });

        // ✅ Step 5: Send Confirmation Email
        if (user) {
            await sendDeletionConfirmation(user.email);
        }

        return res.json({ message: "Your personal data has been deleted. Consent logs are retained for compliance." });

    } catch (error) {
        console.error("❌ Data deletion error:", error);
        return res.status(500).json({ error: "Failed to delete user data." });
    }
});

// ✅ Automatic Log Deletion (Retention Policy: 1 Year)
setInterval(async () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    try {
        const result = await AuditLog.deleteMany({ timestamp: { $lt: oneYearAgo } });
        console.log(`🗑️ Deleted ${result.deletedCount} old audit logs.`);
    } catch (error) {
        console.error("❌ Error deleting old logs:", error);
    }
}, 24 * 60 * 60 * 1000); // Runs once per day

module.exports = router;
