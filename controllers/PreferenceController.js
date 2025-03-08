const User = require("../models/user");
const CookiePreference = require("../models/cookiePreference");

const updateCookiePreferences = async (req, res) => {
    try {
        const { consentId, preferences, deletedAt } = req.body;

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

        // Find existing cookie preference document by consentId
        let cookiePref = await CookiePreference.findOne({ consentId });

        // Prepare the preferences object based on schema
        const updatedPreferences = {
            strictlyNecessary: true, // Always true as per schema default
            performance: preferences.performance || false,
            functional: preferences.functional || false,
            advertising: preferences.advertising || false,
            socialMedia: preferences.socialMedia || false
        };

        if (!cookiePref) {
            // Create new record if none exists
            cookiePref = new CookiePreference({
                consentId,
                preferences: updatedPreferences,
                deletedAt: deletedAt || null
            });
        } else {
            // Update existing record
            cookiePref.preferences = updatedPreferences;
            cookiePref.deletedAt = deletedAt || null;
        }

        // Save the document (Mongoose will apply timestamps and validation)
        await cookiePref.save();

        // Optionally update user's last modified date
        await User.findOneAndUpdate(
            { consentId }, // Assuming consentId links to user
            { updatedAt: new Date() },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Cookie preferences updated successfully',
            data: {
                consentId: cookiePref.consentId,
                preferences: cookiePref.preferences,
                createdAt: cookiePref.createdAt,
                deletedAt: cookiePref.deletedAt
            }
        });
    } catch (error) {
        console.error('Error updating cookie preferences:', error);
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