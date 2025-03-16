const User = require("../models/user");
const CookiePreference = require("../models/cookiePreference");
const Location = require("../models/locationData");
const SecurityLog = require("../models/SecurityLog");

const updateCookiePreferences = async (req, res) => {
    try {
        const { consentId, preferences, deletedAt, ipAddress, locationData } = req.body;
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
            strictlyNecessary: true,
            performance: preferences.performance || false,
            functional: preferences.functional || false,
            advertising: preferences.advertising || false,
            socialMedia: preferences.socialMedia || false
        };

        const cookiePref = await CookiePreference.findOneAndUpdate(
            { consentId },
            { preferences: updatedPreferences, deletedAt: deletedAt || null },
            { upsert: true, new: true }
        );

        // --- Update Location Data ---
        const canUpdateLocation = preferences.performance || preferences.functional;
        let locationDoc = null;

        if (canUpdateLocation && (ipAddress || locationData)) {
            const updatedLocation = {
                ipAddress: ipAddress || locationData?.ipAddress || "unknown",
                country: locationData?.country || "unknown",
                region: locationData?.region || null,
                ipProvider: locationData?.ipProvider || "ipinfo", // Default to ipinfo if not specified
                purpose: "consent-logging",
                consentStatus: "accepted",
                createdAt: new Date() // Refresh TTL
            };

            locationDoc = await Location.findOneAndUpdate(
                { consentId },
                updatedLocation,
                { upsert: true, new: true }
            );
        } else {
            // Mark existing location as deleted if consent is revoked
            locationDoc = await Location.findOne({ consentId });
            if (locationDoc) {
                locationDoc.deletedAt = new Date();
                await locationDoc.save();
            }
        }

        // --- Log Security Data ---
        try {
            await SecurityLog.create({
                ipAddress: ipAddress || locationData?.ipAddress || "unknown",
                consentId: canUpdateLocation ? consentId : null, // Link only if consented
                timestamp: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            });
        } catch (securityError) {
            console.warn("Failed to log security data:", securityError.message);
            // Non-blocking error
        }

        // --- Update User's Last Modified Date ---
        const user = await User.findOneAndUpdate(
            { consentId }, // Assuming consentId links to user
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
                deletedAt: cookiePref.deletedAt,
                location: locationDoc ? {
                    ipAddress: locationDoc.ipAddress,
                    country: locationDoc.country,
                    region: locationDoc.region,
                    ipProvider: locationDoc.ipProvider,
                    purpose: locationDoc.purpose,
                    consentStatus: locationDoc.consentStatus
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