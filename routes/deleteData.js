const express = require("express");
const router = express.Router();
const CookiePreferences = require("../models/cookiePreference");
const Location = require("../models/locationData");
const AuditLog = require("../models/auditLog");
const { verifyMfa } = require("../utils/mfaVerification"); // MFA Verification Function

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
        const cookieData = await CookiePreferences.findOne({ consentId });
        const locationData = await Location.findOne({ consentId });

        if (!cookieData && !locationData) {
            return res.status(404).json({ error: "No user data found for the given Consent ID." });
        }

        // ✅ Step 3: Store an Audit Log (For Compliance)
        await AuditLog.create({
            consentId,
            action: "User Data Deletion",
            deletedData: { cookiePreferences: cookieData, locationData: locationData },
            timestamp: new Date()
        });

        // ✅ Step 4: Delete User-Controlled Data (Keep Audit Logs for Compliance)
        if (cookieData) await CookiePreferences.deleteOne({ consentId });
        if (locationData) await Location.deleteOne({ consentId });

        return res.json({ message: "Your personal data has been deleted. Consent logs are retained for compliance." });

    } catch (error) {
        console.error("Data deletion error:", error);
        return res.status(500).json({ error: "Failed to delete user data." });
    }
});

module.exports = router;
