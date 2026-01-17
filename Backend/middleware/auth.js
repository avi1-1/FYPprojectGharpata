const jwt = require("jsonwebtoken")

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1] || req.headers["x-access-token"]

    if (!token) {
        return res.status(403).json({ message: "No token provided" })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" })
    }
}

// Check if user has specific role
const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(403).json({ message: "User not authenticated" })
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied. Insufficient permissions." })
        }

        next()
    }
}

// Admin authentication middleware
const adminAuth = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" })
        }
        next()
    })
}

// Aliases for backward compatibility
const auth = verifyToken

module.exports = { verifyToken, checkRole, auth, adminAuth }
