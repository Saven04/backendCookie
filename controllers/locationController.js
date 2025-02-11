const axios = require("axios");
const LocationData = require("../models/LocationModel");

const getPublicIPData = async () => {
    try {
        const response = await axios.get("https://api.ipdata.co/?api-key=d2e46351214782d552f706203cb424955384bc556f56ff01dd166651");
        return response.data;
    } catch (error) {
        console.error("Error fetching IP data:", error);
        return null;
    }
};

const saveLocationData = async (req, res) => {
    try {
        const ipData = await getPublicIPData();
        if (!ipData) return res.status(500).json({ message: "Failed to retrieve IP data." });

        // ✅ Anonymize the IP (Mask Last Octet)
        const anonymizedIP = ipData.ip.replace(/\d+$/, "XXX");

        const { consentId } = req.body;
        if (!consentId) {
            return res.status(400).json({ message: "Consent ID is required." });
        }

        const locationData = new LocationData({
            consentId,
            ipAddress: anonymizedIP, // ✅ GDPR-compliant anonymized IP
            isp: ipData.asn.name, 
            city: ipData.city,
            region: ipData.region,
            country: ipData.country_name,
            latitude: ipData.latitude,
            longitude: ipData.longitude,
            postalCode: ipData.postal,
            timezone: ipData.timezone.name,
        });

        await locationData.save();
        res.status(200).json({ message: "Location data saved successfully." });

    } catch (error) {
        console.error("❌ Error saving location data:", error);
        res.status(500).json({ message: "Failed to save location data.", error: error.message });
    }
};

module.exports = { saveLocationData };
