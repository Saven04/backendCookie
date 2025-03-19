const Location = require("../models/locationData");

// Function to save or update location data
const saveLocationData = async ({ consentId, ipAddress, isp, city, country, purpose, consentStatus }) => {
    try {
        // Validate required fields
        if (!consentId || !ipAddress || !isp || !city || !country || !purpose || !consentStatus) {
            throw new Error("Missing required fields: consentId, ipAddress, isp, city, country, purpose, and consentStatus are mandatory.");
        }

        // Validate purpose and consentStatus enums
        const validPurposes = ["gdpr-jurisdiction", "consent-logging", "security"];
        const validConsentStatuses = ["accepted", "rejected", "not-applicable"];
        if (!validPurposes.includes(purpose)) {
            throw new Error(`Purpose must be one of: ${validPurposes.join(", ")}.`);
        }
        if (!validConsentStatuses.includes(consentStatus)) {
            throw new Error(`Consent status must be one of: ${validConsentStatuses.join(", ")}.`);
        }

        console.log(`🔹 Processing Location Data for Consent ID: ${consentId}`);

        // Prepare location data
        const locationData = {
            ipAddress,
            isp,
            city,
            country,
            purpose,
            consentStatus,
            createdAt: new Date(), // Refresh creation date on update
            deletedAt: null // Reset deletedAt on save/update
        };

        // Upsert location data
        const updatedLocation = await Location.findOneAndUpdate(
            { consentId },
            locationData,
            { upsert: true, new: true }
        );

        const message = updatedLocation.isNew ? "Location data saved successfully." : "Location data updated successfully.";
        console.log(updatedLocation.isNew ? "✅ Saving new location data..." : "🔄 Updating existing location data...");
        return { message, consentId };
    } catch (error) {
        console.error("❌ Error saving location data:", error.message);
        throw new Error("Failed to save location data: " + error.message);
    }
};

// Function to soft delete location data by consentId
const deleteLocationData = async (consentId) => {
    try {
        if (!consentId) {
            throw new Error("Consent ID is required.");
        }

        console.log(`🔹 Soft Deleting Location Data for Consent ID: ${consentId}`);

        const locationDoc = await Location.findOne({ consentId, deletedAt: null });
        if (!locationDoc) {
            throw new Error(`No active location data found for Consent ID: ${consentId}`);
        }

        await locationDoc.softDelete();

        console.log("✅ Location data soft-deleted successfully.");
        return { message: "Location data soft-deleted successfully", consentId };
    } catch (error) {
        console.error("❌ Error soft-deleting location data:", error.message);
        throw new Error("Failed to soft-delete location data: " + error.message);
    }
};

module.exports = { saveLocationData, deleteLocationData };