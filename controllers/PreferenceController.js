// Assuming these are your existing schema models
const User = require("../models/user"); 
const CookiePreference = require("../models/cookiePreference");;

// Update cookie preferences
const updateCookiePreferences = async (req, res) => {
    try {
        const { consentId, preferences, deletedAt } = req.body;

        if (!consentId) {
            return res.status(400).json({
                success: false,
                message: 'Consent ID is required'
            });
        }

        // Find existing cookie preference document by consentId
        let cookiePref = await CookiePreference.findOne({ consentId });

        if (!cookiePref) {
            // If no existing record found, create a new one
            cookiePref = new CookiePreference({
                consentId,
                preferences: {
                    essential: true, // Always true
                    analytics: preferences.analytics || false,
                    marketing: preferences.marketing || false
                },
                timestamp: preferences.timestamp || new Date(),
                deletedAt: deletedAt || null
            });
        } else {
            // Update existing record
            cookiePref.preferences = {
                essential: true, // Always true
                analytics: preferences.analytics || false,
                marketing: preferences.marketing || false
            };
            cookiePref.timestamp = preferences.timestamp || new Date();
            cookiePref.deletedAt = deletedAt || null;
        }

        // Save the updated/new document
        await cookiePref.save();

        // Optionally, you might want to update the user's last modified date
        await User.findOneAndUpdate(
            { consentId }, // Assuming consentId is linked to user
            { updatedAt: new Date() },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Cookie preferences updated successfully',
            data: {
                consentId: cookiePref.consentId,
                preferences: cookiePref.preferences,
                timestamp: cookiePref.timestamp,
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

// Export the controller function
module.exports = {
    updateCookiePreferences
};