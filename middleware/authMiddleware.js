// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const authMiddleware = async (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: No valid token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Unauthorized: Token missing" });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.userId) {
            return res.status(401).json({ message: "Unauthorized: Invalid token payload" });
        }

        // Fetch user from database (optional if email is in JWT)
        const user = await User.findById(decoded.userId).select("email"); // Only fetch email
        if (!user) {
            return res.status(401).json({ message: "Unauthorized: User not found" });
        }

        // Attach user to request
        req.user = user;

        // Optionally set rawEmail from JWT for backward compatibility
        req.rawEmail = decoded.rawEmail || user.email; // Fallback to user.email if rawEmail isn’t in JWT

        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Unauthorized: Token has expired" });
        } else if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Unauthorized: Invalid token" });
        }
        res.status(401).json({ message: "Unauthorized: Token verification failed" });
    }
};

module.exports = authMiddleware;