const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user"); // Make sure the path reflects the updated model file name
const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use!" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user with consentId
        const newUser = new User({ 
            username, 
            email, 
            password: hashedPassword 
        });

        // Save the user which will generate and set the consentId automatically
        await newUser.save();

        res.status(201).json({ 
            message: "User registered successfully!", 
            consentId: newUser.consentId // Return the consentId to the client
        });
    } catch (error) {
        console.error("Error in registration:", error);
        res.status(500).json({ message: "Server error. Please try again later." });
    }
});

module.exports = router;
