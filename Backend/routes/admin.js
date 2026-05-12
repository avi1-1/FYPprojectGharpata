// Admin management routes for user and property approval
const express = require("express")
const { adminAuth } = require("../middleware/auth")
const router = express.Router()

// Get all users pending approval
router.get("/pending-users", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    // Fetch all unapproved users except admins
    const [users] = await pool.query('SELECT * FROM users WHERE isApproved = false AND role != "admin"')
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message })
  }
})

// Approve a user account
router.put("/approve-user/:userId", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    // Set user as approved in database
    await pool.query("UPDATE users SET isApproved = true WHERE id = ?", [req.params.userId])
    res.json({ message: "User approved" })
  } catch (error) {
    res.status(500).json({ message: "Error approving user", error: error.message })
  }
})

// Reject and delete a user account
router.delete("/reject-user/:userId", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    // Remove rejected user from database
    await pool.query("DELETE FROM users WHERE id = ?", [req.params.userId])
    res.json({ message: "User rejected and removed" })
  } catch (error) {
    res.status(500).json({ message: "Error rejecting user", error: error.message })
  }
})

// Get all users for management (excluding admins)
router.get("/all-users", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    // Get all users except admins, ordered by newest first
    const [users] = await pool.query('SELECT * FROM users WHERE role != "admin" ORDER BY createdAt DESC');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
});

// Delete any user account (general delete)
router.delete("/delete-user/:userId", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    // Delete user from database (cascade deletes handled by DB)
    await pool.query("DELETE FROM users WHERE id = ?", [req.params.userId]);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
});

// Get all properties pending approval
router.get("/pending-properties", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    // Fetch unapproved properties with landlord information
    const [properties] = await pool.query(
      "SELECT p.*, u.name as landlordName FROM properties p JOIN users u ON p.landlordId = u.id WHERE p.isApproved = false",
    )
    res.json(properties)
  } catch (error) {
    console.error("Admin Fetch Properties Error:", error)
    // Log error to file for debugging
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

// Get all complaints (with user names for admin view)
router.get("/complaints", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const [complaints] = await pool.query(`
      SELECT c.*,
        t.name AS tenantName, t.email AS tenantEmail,
        l.name AS landlordName, l.email AS landlordEmail,
        fb.name AS filedByName, fb.role AS filedByRole,
        fa.name AS filedAgainstName, fa.role AS filedAgainstRole
      FROM complaints c
      JOIN users t ON c.tenantId = t.id
      JOIN users l ON c.landlordId = l.id
      LEFT JOIN users fb ON c.filedBy = fb.id
      LEFT JOIN users fa ON c.filedAgainst = fa.id
      ORDER BY c.createdAt DESC
    `)
    const parsed = complaints.map(c => ({
      ...c,
      comments: (() => {
        try { return typeof c.comments === "string" ? JSON.parse(c.comments) : (c.comments || []) } catch { return [] }
      })()
    }))
    res.json(parsed)
  } catch (error) {
    res.status(500).json({ message: "Error fetching complaints", error: error.message })
  }
})

// Admin override complaint status
router.put("/complaints/:id/status", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { status, adminRemarks, resolution } = req.body
    
    if (status) {
      const ADMIN_STATUSES = ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED", "ESCALATED", "CLOSED", "FORCE_RESOLVED", "WARNING_ISSUED", "ACCOUNT_SUSPENDED"];
      const cleanStatus = status.toUpperCase().trim();
      
      if (!ADMIN_STATUSES.includes(cleanStatus)) {
        return res.status(400).json({ message: "Invalid status", allowed: ADMIN_STATUSES });
      }
      
      const resolvedAt = ["RESOLVED", "CLOSED", "FORCE_RESOLVED", "ACCOUNT_SUSPENDED"].includes(cleanStatus) ? new Date() : null;
      
      console.log(`[Admin] Processing status update for complaint ${req.params.id} to ${cleanStatus}`);
      
      await pool.query(
        "UPDATE complaints SET status = ?, adminRemarks = ?, resolution = ?, resolvedAt = ?, updatedAt = NOW() WHERE id = ?",
        [cleanStatus, adminRemarks || null, resolution || null, resolvedAt, req.params.id]
      );

      // ACCOUNT SUSPENSION LOGIC
      if (cleanStatus === "ACCOUNT_SUSPENDED") {
        const [rows] = await pool.query("SELECT filedAgainst FROM complaints WHERE id = ?", [req.params.id]);
        if (rows.length > 0 && rows[0].filedAgainst) {
          const userId = rows[0].filedAgainst;
          const [result] = await pool.query(
            "UPDATE users SET suspendedUntil = DATE_ADD(NOW(), INTERVAL 2 WEEK) WHERE id = ?",
            [userId]
          );
          console.log(`[Admin] User ${userId} suspension: ${result.affectedRows > 0 ? "SUCCESS" : "FAILED"}`);
        }
      }
    }

    res.json({ message: `Complaint updated successfully` })
  } catch (error) {
    console.error("[Admin Update Error]:", error);
    res.status(500).json({ message: "Error updating complaint", error: error.message })
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

// Get all payments (Admin View)
router.get("/payments", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const [payments] = await pool.query(`
      SELECT pay.*,
             t.name AS tenantName, t.email AS tenantEmail,
             l.name AS landlordName, l.email AS landlordEmail,
             p.title AS propertyTitle
      FROM payments pay
      JOIN users t ON pay.tenantId = t.id
      JOIN users l ON pay.landlordId = l.id
      JOIN bookings b ON pay.bookingId = b.id
      JOIN properties p ON b.propertyId = p.id
      ORDER BY pay.createdAt DESC
    `)
    res.json(payments)
  } catch (error) {
    res.status(500).json({ message: "Error fetching payments", error: error.message })
  }
})

// Get all bookings/agreements (Admin View)
router.get("/bookings", adminAuth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const [bookings] = await pool.query(`
      SELECT b.*,
             t.name AS tenantName, t.email AS tenantEmail,
             l.name AS landlordName, l.email AS landlordEmail,
             p.title AS propertyTitle, p.address AS propertyAddress
      FROM bookings b
      JOIN users t ON b.tenantId = t.id
      JOIN users l ON b.landlordId = l.id
      JOIN properties p ON b.propertyId = p.id
      ORDER BY b.createdAt DESC
    `)
    res.json(bookings)
  } catch (error) {
    res.status(500).json({ message: "Error fetching bookings", error: error.message })
  }
})

module.exports = router
