const express = require("express")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Create complaint
router.post("/", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { bookingId, title, description, category, severity, images } = req.body

    const [bookings] = await pool.query("SELECT * FROM bookings WHERE id = ?", [bookingId])
    if (bookings.length === 0) {
      return res.status(404).json({ message: "Booking not found" })
    }

    const booking = bookings[0]

    if (req.user.id !== booking.tenantId) {
      return res.status(403).json({ message: "Only tenant can create complaint" })
    }

    const [result] = await pool.query(
      "INSERT INTO complaints (bookingId, tenantId, landlordId, title, description, category, severity, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [bookingId, req.user.id, booking.landlordId, title, description, category, severity, JSON.stringify(images)],
    )

    res.status(201).json({ message: "Complaint created", complaintId: result.insertId })
  } catch (error) {
    res.status(500).json({ message: "Error creating complaint", error: error.message })
  }
})

// Get complaints
router.get("/", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const [complaints] = await pool.query(
      "SELECT * FROM complaints WHERE tenantId = ? OR landlordId = ? ORDER BY createdAt DESC",
      [req.user.id, req.user.id],
    )

    res.json(complaints)
  } catch (error) {
    res.status(500).json({ message: "Error fetching complaints", error: error.message })
  }
})

// Update complaint status
router.put("/:id/status", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { status, adminRemarks, resolution } = req.body

    const [complaints] = await pool.query("SELECT * FROM complaints WHERE id = ?", [req.params.id])
    if (complaints.length === 0) {
      return res.status(404).json({ message: "Complaint not found" })
    }

    const complaint = complaints[0]
    if (req.user.role === "landlord" && req.user.id !== complaint.landlordId) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    await pool.query(
      "UPDATE complaints SET status = ?, adminRemarks = ?, resolution = ?, resolvedAt = ? WHERE id = ?",
      [status, adminRemarks, resolution, status === "resolved" ? new Date() : null, req.params.id],
    )

    res.json({ message: "Complaint updated" })
  } catch (error) {
    res.status(500).json({ message: "Error updating complaint", error: error.message })
  }
})

module.exports = router
