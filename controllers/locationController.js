const Location = require("../models/locationData");

// Function to save or update location data
const saveLocationData = async ({ consentId, ipAddress, isp, city, country, latitude, longitude }) => {
    try {
        if (!consentId || !ipAddress || !isp || !city || !country) {
            throw new Error("Missing required fields: consentId, ipAddress, isp, city, and country are mandatory.");
        }

        console.log(`🔹 Processing Location Data for Consent ID: ${consentId}`);

        // Check if location data for the same consentId already exists
        let locationData = await Location.findOne({ consentId });

        if (locationData) {
            console.log("🔄 Updating existing location data...");
            locationData.ipAddress = ipAddress;
            locationData.isp = isp;
            locationData.city = city;
            locationData.country = country;
            locationData.latitude = latitude;
            locationData.longitude = longitude;
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

module.exports = { saveLocationData };
