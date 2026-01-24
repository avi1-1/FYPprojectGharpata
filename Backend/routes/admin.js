const express = require("express")
const { adminAuth } = require("../middleware/auth")
const router = express.Router()

// Get all unapproved users
router.get("/pending-users", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const [users] = await pool.query('SELECT * FROM users WHERE isApproved = false AND role != "admin"')
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message })
  }
})

// Approve user
router.put("/approve-user/:userId", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    await pool.query("UPDATE users SET isApproved = true WHERE id = ?", [req.params.userId])
    res.json({ message: "User approved" })
  } catch (error) {
    res.status(500).json({ message: "Error approving user", error: error.message })
  }
})

// Reject user
router.delete("/reject-user/:userId", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    await pool.query("DELETE FROM users WHERE id = ?", [req.params.userId])
    res.json({ message: "User rejected and removed" })
  } catch (error) {
    res.status(500).json({ message: "Error rejecting user", error: error.message })
  }
})

// Get all users (for management)
router.get("/all-users", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    // Get all users except admin themselves, order by newest first
    const [users] = await pool.query('SELECT * FROM users WHERE role != "admin" ORDER BY createdAt DESC');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
});

// Delete user (General delete)
router.delete("/delete-user/:userId", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    // Optional: Check if user exists or has dependencies (cascade delete handle by DB usually, or need manual cleanup)
    // For now, simple delete
    await pool.query("DELETE FROM users WHERE id = ?", [req.params.userId]);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
});

// Get all unapproved properties
router.get("/pending-properties", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const [properties] = await pool.query(
      "SELECT p.*, u.name as landlordName FROM properties p JOIN users u ON p.landlordId = u.id WHERE p.isApproved = false",
    )
    res.json(properties)
  } catch (error) {
    console.error("Admin Fetch Properties Error:", error)
    const logData = `[${new Date().toISOString()}] GET /api/admin/pending-properties Error: ${error.message}\nStack: ${error.stack}\n\n`;
    const fs = require('fs');
    try { fs.appendFileSync('server_error.log', logData); } catch (e) { }

    res.status(500).json({ message: "Error fetching properties", error: error.message })
  }
})

// Approve property
router.put("/approve-property/:propertyId", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    await pool.query("UPDATE properties SET isApproved = true WHERE id = ?", [req.params.propertyId])
    res.json({ message: "Property approved" })
  } catch (error) {
    res.status(500).json({ message: "Error approving property", error: error.message })
  }
})

// Reject property
router.delete("/reject-property/:propertyId", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    // Note: In real app, might want to delete images too
    await pool.query("DELETE FROM properties WHERE id = ?", [req.params.propertyId])
    res.json({ message: "Property rejected and removed" })
  } catch (error) {
    res.status(500).json({ message: "Error rejecting property", error: error.message })
  }
})

// Get all properties (Manage Listings)
router.get("/all-properties", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const [properties] = await pool.query(
      "SELECT p.*, u.name as landlordName FROM properties p JOIN users u ON p.landlordId = u.id ORDER BY p.createdAt DESC",
    )
    res.json(properties)
  } catch (error) {
    res.status(500).json({ message: "Error fetching all properties", error: error.message })
  }
})

// Get all complaints
router.get("/complaints", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const [complaints] = await pool.query("SELECT * FROM complaints ORDER BY createdAt DESC")
    res.json(complaints)
  } catch (error) {
    res.status(500).json({ message: "Error fetching complaints", error: error.message })
  }
})

// Get dashboard stats
router.get("/stats", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool

    const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role != "admin" AND isApproved = true')
    const [totalProperties] = await pool.query("SELECT COUNT(*) as count FROM properties WHERE isApproved = true")
    const [totalBookings] = await pool.query("SELECT COUNT(*) as count FROM bookings")
    const [totalPayments] = await pool.query('SELECT COUNT(*) as count FROM payments WHERE status = "completed"')

    res.json({
      totalUsers: totalUsers[0].count,
      totalProperties: totalProperties[0].count,
      totalBookings: totalBookings[0].count,
      totalPayments: totalPayments[0].count,
    })
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats", error: error.message })
  }
})

module.exports = router
