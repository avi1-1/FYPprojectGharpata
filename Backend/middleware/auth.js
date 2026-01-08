// JWT authentication middleware for route protection
const jwt = require("jsonwebtoken")

// Verify JWT token and check user suspension status
const verifyToken = async (req, res, next) => {
    // Extract token from Authorization header or x-access-token header
    const token = req.headers.authorization?.split(" ")[1] || req.headers["x-access-token"]

    if (!token) {
        return res.status(403).json({ message: "No token provided" })
    }

    try {
        // Verify and decode JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded

        // Check if user is currently suspended
        const pool = req.app.locals.pool
        const [users] = await pool.query("SELECT suspendedUntil FROM users WHERE id = ?", [req.user.id])
        
        if (users.length > 0) {
            const user = users[0]
            // Block access if suspension is still active
            if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
                const remainingDays = Math.ceil((new Date(user.suspendedUntil) - new Date()) / (1000 * 60 * 60 * 24))
                return res.status(403).json({ 
                    message: `Account currently suspended. Please re-login in ${remainingDays} day${remainingDays > 1 ? 's' : ''}.`,
                    isSuspended: true
                })
            }
        }

        next()
    } catch (error) {
        if (error.status === 403) return res.status(403).json(error.body)
        return res.status(401).json({ message: "Invalid or expired token" })
    }
}

// Check if user has required role(s)
const checkRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(403).json({ message: "User not authenticated" })
        }

        // Check if user's role is in allowed roles list
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied. Insufficient permissions." })
        }

        next()
    }
}

// Admin-only authentication middleware
const adminAuth = async (req, res, next) => {
    await verifyToken(req, res, () => {
        // Ensure user is admin role
        if (req.user && req.user.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" })
        }
        if (req.user) next()
    })
}

// Alias for backward compatibility
const auth = verifyToken

module.exports = { verifyToken, checkRole, auth, adminAuth }
