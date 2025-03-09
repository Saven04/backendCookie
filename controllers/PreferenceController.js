const User = require("../models/user");
const CookiePreference = require("../models/cookiePreference");
const Location = require("../models/locationData");

const updateCookiePreferences = async (req, res) => {
    try {
        const { consentId, preferences, deletedAt, ipAddress, location } = req.body;

        if (!consentId) {
            return res.status(400).json({
                success: false,
                message: 'Consent ID is required'
            });
        }

        if (!preferences || typeof preferences !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Preferences object is required'
            });
        }

        // --- Update Cookie Preferences ---
        let cookiePref = await CookiePreference.findOne({ consentId });

        const updatedPreferences = {
            strictlyNecessary: true, // Always true as per schema default
            performance: preferences.performance || false,
            functional: preferences.functional || false,
            advertising: preferences.advertising || false,
            socialMedia: preferences.socialMedia || false
        };

        if (!cookiePref) {
            cookiePref = new CookiePreference({
                consentId,
                preferences: updatedPreferences,
                deletedAt: deletedAt || null
            });
        } else {
            cookiePref.preferences = updatedPreferences;
            cookiePref.deletedAt = deletedAt || null;
        }

        await cookiePref.save();

        // --- Update Location Data ---
        let locationDoc = await Location.findOne({ consentId });

        // Only update location if user consents to performance or functional (GDPR compliance)
        const canUpdateLocation = preferences.performance || preferences.functional;

        const updatedLocation = {
            ipAddress: canUpdateLocation ? ipAddress || locationDoc?.location.ipAddress : null,
            city: canUpdateLocation ? location?.city || locationDoc?.location.city : null,
            country: canUpdateLocation ? location?.country || locationDoc?.location.country : null,
            latitude: canUpdateLocation ? location?.latitude || locationDoc?.location.latitude : null,
            longitude: canUpdateLocation ? location?.longitude || locationDoc?.location.longitude : null
        };

        if (!locationDoc) {
            if (canUpdateLocation) { // Only create if consent is given
                locationDoc = new Location({
                    consentId,
                    location: updatedLocation,
                    deletedAt: deletedAt || null
                });
            }
        } else {
            locationDoc.location = updatedLocation;
            locationDoc.deletedAt = deletedAt || null;
        }

        if (locationDoc) {
            await locationDoc.save();
        }

        // --- Update User's Last Modified Date ---
        await User.findOneAndUpdate(
            { consentId }, // Assuming consentId links to user
            { updatedAt: new Date() },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Cookie preferences and location data updated successfully',
            data: {
                consentId: cookiePref.consentId,
                preferences: cookiePref.preferences,
                createdAt: cookiePref.createdAt,
                deletedAt: cookiePref.deletedAt,
                location: locationDoc ? locationDoc.location : null
            }
        });
    } catch (error) {
        console.error('Error updating cookie preferences and location data:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    updateCookiePreferences
};