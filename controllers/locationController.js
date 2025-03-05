const Consent = require("../models/consent");

// Function to save or update location data in the Consent model
const saveLocationData = async ({ consentId, ipAddress, isp, city, country, latitude, longitude }) => {
    try {
        if (!consentId || !ipAddress || !isp || !city || !country) {
            throw new Error("Missing required fields: consentId, ipAddress, isp, city, and country are mandatory.");
        }

        console.log(`🔹 Processing Location Data for Consent ID: ${consentId}`);

        // Check if consent data for the same consentId already exists
        let consent = await Consent.findOne({ consentId });

        if (consent) {
            console.log("🔄 Updating existing location data...");
            consent.locationData = {
                ipAddress,
                isp,
                city,
                country,
                latitude,
                longitude,
            };
            await consent.save();
            return { message: "Location data updated successfully.", consentId };
        } else {
            console.log("✅ Saving new location data...");
            consent = new Consent({
                consentId,
                preferences: {}, // Initialize preferences as an empty object
                locationData: {
                    ipAddress,
                    isp,
                    city,
                    country,
                    latitude,
                    longitude,
                },
            });

            await consent.save();
            return { message: "Location data saved successfully.", consentId };
        }
    } catch (error) {
        console.error("❌ Error saving location data:", error.message);
        throw new Error("Failed to save location data: " + error.message);
    }
};

// Function to delete location data by consentId
const deleteLocationData = async (consentId) => {
    try {
        if (!consentId) {
            throw new Error("Consent ID is required.");
        }

        console.log(`🔹 Deleting Location Data for Consent ID: ${consentId}`);

        const result = await Consent.updateOne(
            { consentId },
            { $unset: { locationData: 1 } } // Remove the locationData field
        );

        if (result.matchedCount === 0) {
            throw new Error(`No consent data found for Consent ID: ${consentId}`);
        }

        console.log("✅ Location data deleted successfully.");
        return { message: "Location data deleted successfully", consentId };
    } catch (error) {
        console.error("❌ Error deleting location data:", error.message);
        throw new Error("Failed to delete location data: " + error.message);
    }
};

module.exports = { saveLocationData, deleteLocationData };