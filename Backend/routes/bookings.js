const express = require("express")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Create booking
router.post("/", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { propertyId, moveInDate, moveOutDate, monthlyRent, depositAmount } = req.body

    if (req.user.role !== "tenant") {
      return res.status(403).json({ message: "Only tenants can create bookings" })
    }

    // Get property details
    const [properties] = await pool.query("SELECT * FROM properties WHERE id = ?", [propertyId])
    if (properties.length === 0) {
      return res.status(404).json({ message: "Property not found" })
    }

    const landlordId = properties[0].landlordId

    // Create booking
    const [result] = await pool.query(
      "INSERT INTO bookings (propertyId, tenantId, landlordId, moveInDate, moveOutDate, monthlyRent, depositAmount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [propertyId, req.user.id, landlordId, moveInDate, moveOutDate, monthlyRent, depositAmount, "pending"],
    )

    res.status(201).json({ message: "Booking created successfully", bookingId: result.insertId })
  } catch (error) {
    res.status(500).json({ message: "Error creating booking", error: error.message })
  }
})

// Get user's bookings
router.get("/user/:userId", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const [bookings] = await pool.query(
      "SELECT b.*, p.title, p.address FROM bookings b JOIN properties p ON b.propertyId = p.id WHERE (b.tenantId = ? OR b.landlordId = ?)",
      [req.user.id, req.user.id],
    )

    res.json(bookings)
  } catch (error) {
    res.status(500).json({ message: "Error fetching bookings", error: error.message })
  }
})

// Approve/Reject booking
router.put("/:id/status", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { status } = req.body

    const [bookings] = await pool.query("SELECT * FROM bookings WHERE id = ?", [req.params.id])
    if (bookings.length === 0 || bookings[0].landlordId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    await pool.query("UPDATE bookings SET status = ? WHERE id = ?", [status, req.params.id])

    if (status === "approved") {
      // Update property status
      await pool.query('UPDATE properties SET status = "booked" WHERE id = ?', [bookings[0].propertyId])
    }

    res.json({ message: `Booking ${status}` })
  } catch (error) {
    res.status(500).json({ message: "Error updating booking", error: error.message })
  }
})

module.exports = router
