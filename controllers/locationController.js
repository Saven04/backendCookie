const Location = require("../models/locationData");
const User = require("../models/user");

// Function to save or update location data
const saveLocationData = async ({ consentId, ipAddress, isp, city, country, latitude, longitude }) => {
    try {
        if (!consentId || !ipAddress || !isp || !city || !country) {
            throw new Error("Missing required fields: consentId, ipAddress, isp, city, and country are mandatory.");
        }

        console.log(`🔹 Processing Location Data for Consent ID: ${consentId}`);

        // Check if user exists with this consentId
        const user = await User.findOne({ consentId });
        if (!user) {
            throw new Error("No user found with this Consent ID.");
        }

        // Check if location data for the same consentId already exists
        let locationData = await Location.findOne({ consentId });

        if (locationData) {
            console.log("🔄 Updating existing location data...");
            locationData.ipAddress = ipAddress;
            locationData.isp = isp;
            locationData.city = city;
            locationData.country = country;
            locationData.latitude = latitude || locationData.latitude; // Keep existing value if not provided
            locationData.longitude = longitude || locationData.longitude;
            await locationData.save();
            return { message: "Location data updated successfully.", consentId };
        } else {
            console.log("✅ Saving new location data...");
            locationData = new Location({
                consentId,
                ipAddress,
                isp,
                city,
                country,
                latitude,
                longitude,
            });

            await locationData.save();
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

        // Check if user exists with this consentId
        const user = await User.findOne({ consentId });
        if (!user) {
            throw new Error("No user found with this Consent ID.");
        }

        const result = await Location.deleteOne({ consentId });

        if (result.deletedCount === 0) {
            throw new Error(`No location data found for Consent ID: ${consentId}`);
        }

        console.log("✅ Location data deleted successfully.");
        return { message: "Location data deleted successfully", consentId };
    } catch (error) {
        console.error("❌ Error deleting location data:", error.message);
        throw new Error("Failed to delete location data: " + error.message);
    }
};

module.exports = { saveLocationData, deleteLocationData };
