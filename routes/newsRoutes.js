const express = require("express");
const axios = require("axios");
const User = require("../models/locationData"); // Assuming you store IP in userModel
const router = express.Router();

const NEWS_API_KEY = "ffd35d0e1efe4cf1bd052e6dd7835eec";

// Function to get country from IP (using IP stored in DB)
const getCountryFromIP = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.ipAddress) return "us"; // Default to US if no IP

        // Use ip-api to get country code
        const { data } = await axios.get(`http://ip-api.com/json/${user.ipAddress}`);
        return data.countryCode.toLowerCase(); // Example: 'in' for India
    } catch (error) {
        console.error("Error fetching country from IP:", error);
        return "us"; // Default fallback
    }
};

// News API Route
router.get("/news", async (req, res) => {
    const { category = "general", userId } = req.query;
    
    try {
        const country = await getCountryFromIP(userId); // Get country code
        const newsUrl = `https://newsapi.org/v2/top-headlines?category=${category}&country=${country}&apiKey=${NEWS_API_KEY}`;
        
        const { data } = await axios.get(newsUrl);
        res.json(data.articles);
    } catch (error) {
        console.error("Error fetching news:", error);
        res.status(500).json({ error: "Failed to fetch news" });
    }
});

module.exports = router;
