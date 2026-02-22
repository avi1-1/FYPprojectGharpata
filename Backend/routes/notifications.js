const express = require("express")
const router = express.Router()
const { verifyToken } = require("../middleware/auth")

router.get("/counts", verifyToken, async (req, res) => {
    try {
        const pool = req.app.locals.pool
        const userId = req.user.id
        const userRole = req.user.role

        const counts = {
            pendingUsers: 0,
            pendingProperties: 0,
            complaints: 0,
            bookings: 0
        }

        if (userRole === "admin") {
            const [pUsers] = await pool.query("SELECT COUNT(*) as count FROM users WHERE isApproved = false AND role != 'admin'")
            const [pProps] = await pool.query("SELECT COUNT(*) as count FROM properties WHERE isApproved = false")
            const [openComplaints] = await pool.query("SELECT COUNT(*) as count FROM complaints WHERE status NOT IN ('CLOSED', 'REJECTED', 'RESOLVED')")

            counts.pendingUsers = pUsers[0].count
            counts.pendingProperties = pProps[0].count
            counts.complaints = openComplaints[0].count
        } else if (userRole === "landlord") {
            const [newBookings] = await pool.query("SELECT COUNT(*) as count FROM bookings WHERE landlordId = ? AND status = 'pending'", [userId])
            const [llComplaints] = await pool.query("SELECT COUNT(*) as count FROM complaints WHERE landlordId = ? AND status NOT IN ('CLOSED', 'REJECTED', 'RESOLVED')", [userId])

            counts.bookings = newBookings[0].count
            counts.complaints = llComplaints[0].count
        } else if (userRole === "tenant") {
            const [actionComplaints] = await pool.query("SELECT COUNT(*) as count FROM complaints WHERE tenantId = ? AND status = 'RESOLVED'", [userId])
            const [activeBookings] = await pool.query("SELECT COUNT(*) as count FROM bookings WHERE tenantId = ? AND status IN ('confirmed', 'contract_agreed', 'approved')", [userId])

            counts.complaints = actionComplaints[0].count
            counts.bookings = activeBookings[0].count
        }

        res.json(counts)
    } catch (error) {
        console.error("Error fetching notification counts:", error)
        res.status(500).json({ message: "Error fetching notification counts", error: error.message })
    }
})

module.exports = router
