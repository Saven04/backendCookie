const jwt = require("jsonwebtoken");

module.exports = function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Extract token from "Bearer <token>"

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    jwt.verify(token, process.env.JWT_SECRET || "default_secret", (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid or expired token." });
        }
        req.user = user; // Attach the decoded user object to the request
        next();
    });
};