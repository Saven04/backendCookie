const axios = require("axios");
require("dotenv").config();

// Fetch news based on category & country
exports.getNews = async (req, res) => {
  try {
    const category = req.query.category || "general"; // Default category
    const country = req.query.country || "us"; // Default country

    const apiKey = process.env.NEWS_API_KEY; // Store API key in .env file
    const url = `https://newsapi.org/v2/top-headlines?category=${category}&country=${country}&apiKey=${apiKey}`;

    const response = await axios.get(url);
    res.json(response.data.articles); // Return news articles to frontend
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({ error: "Failed to fetch news." });
  }
};
