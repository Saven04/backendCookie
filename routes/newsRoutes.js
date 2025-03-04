const express = require("express");
const router = express.Router();
const newsController = require("../controllers/newsController");

// Route to fetch news articles dynamically
router.get("/", newsController.getNews);

module.exports = router;
