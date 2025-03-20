const User = require("../models/user");
const CookiePreference = require("../models/cookiePreference");
const Location = require("../models/locationData");
const SecurityLog = require("../models/SecurityLog");

const updateCookiePreferences = async (req, res) => {
    try {
        const { consentId, preferences } = req.body;
        const token = req.headers.authorization?.split(" ")[1];

        // Validation
        if (!consentId) {
            return res.status(400).json({
                success: false,
                message: "Consent ID is required"
            });
        }

        if (!preferences || typeof preferences !== "object") {
            return res.status(400).json({
                success: false,
                message: "Preferences object is required"
            });
        }

        // --- Update Cookie Preferences ---
        const updatedPreferences = {
            strictlyNecessary: true, // Always true per GDPR
            performance: preferences.performance || false,
            functional: preferences.functional || false,
            advertising: preferences.advertising || false,
            socialMedia: preferences.socialMedia || false
        };

        const cookiePref = await CookiePreference.findOneAndUpdate(
            { consentId },
            { preferences: updatedPreferences, updatedAt: new Date() },
            { upsert: true, new: true }
        );

        // --- Update Location Data ---
        const hasConsent = preferences.performance || preferences.functional || preferences.advertising || preferences.socialMedia;
        let locationDoc = await Location.findOne({ consentId });
        const consentStatus = hasConsent ? "accepted" : "rejected";

        if (hasConsent) {
            // Fetch fresh location data from ipinfo.io if consent is given
            const response = await fetch("https://ipinfo.io/json?token=10772b28291307");
            if (!response.ok) throw new Error("Failed to fetch location data from ipinfo");

            const ipData = await response.json();

            const updatedLocation = {
                consentId,
                ipAddress: ipData.ip || "unknown",
                isp: ipData.org || "unknown",
                city: ipData.city || "unknown",
                country: ipData.country || "unknown",
                purpose: "consent-logging",
                consentStatus: "accepted",
                updatedAt: new Date(),
                deletedAt: null // Restore if previously soft-deleted
            };

            locationDoc = await Location.findOneAndUpdate(
                { consentId },
                updatedLocation,
                { upsert: true, new: true }
            );
        } else if (locationDoc && !locationDoc.deletedAt) {
            // Soft-delete location data if consent is revoked
            locationDoc.consentStatus = "rejected";
            locationDoc.deletedAt = new Date();
            locationDoc.updatedAt = new Date();
            await locationDoc.save();
        }

        // --- Log Security Data ---
        try {
            await SecurityLog.create({
                ipAddress: ipData?.ip || "unknown",
                consentId: hasConsent ? consentId : null, // Link only if consented
                timestamp: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            });
        } catch (securityError) {
            console.warn("Failed to log security data:", securityError.message);
            // Non-blocking error
        }

        // --- Update User's Last Modified Date ---
        const user = await User.findOneAndUpdate(
            { consentId },
            { updatedAt: new Date() },
            { new: true }
        );

        if (!user && token) {
            console.warn(`No user found for consentId: ${consentId}`);
        }

        res.status(200).json({
            success: true,
            message: "Cookie preferences and location data updated successfully",
            data: {
                consentId: cookiePref.consentId,
                preferences: cookiePref.preferences,
                createdAt: cookiePref.createdAt,
                updatedAt: cookiePref.updatedAt,
                deletedAt: cookiePref.deletedAt || null,
                location: locationDoc ? {
                    ipAddress: locationDoc.ipAddress,
                    isp: locationDoc.isp,
                    city: locationDoc.city,
                    country: locationDoc.country,
                    purpose: locationDoc.purpose,
                    consentStatus: locationDoc.consentStatus,
                    createdAt: locationDoc.createdAt,
                    updatedAt: locationDoc.updatedAt,
                    deletedAt: locationDoc.deletedAt || null
                } : null
            }
        });
    } catch (error) {
        console.error("Error updating cookie preferences and location data:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

module.exports = {
    updateCookiePreferences
};