const express = require("express")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Create payment record
router.post("/", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { bookingId, amount, paymentType, paymentMethod, dueDate } = req.body

    const [bookings] = await pool.query("SELECT * FROM bookings WHERE id = ?", [bookingId])
    if (bookings.length === 0) {
      return res.status(404).json({ message: "Booking not found" })
    }

    const booking = bookings[0]
    const payment = await pool.query(
      "INSERT INTO payments (bookingId, tenantId, landlordId, amount, paymentType, paymentMethod, status, dueDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [bookingId, booking.tenantId, booking.landlordId, amount, paymentType, paymentMethod, "pending", dueDate],
    )

    res.status(201).json({ message: "Payment created", paymentId: payment[0].insertId })
  } catch (error) {
    res.status(500).json({ message: "Error creating payment", error: error.message })
  }
})

// Get payments
router.get("/", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const [payments] = await pool.query(
      "SELECT * FROM payments WHERE tenantId = ? OR landlordId = ? ORDER BY createdAt DESC",
      [req.user.id, req.user.id],
    )

    res.json(payments)
  } catch (error) {
    res.status(500).json({ message: "Error fetching payments", error: error.message })
  }
})

// Mark payment as completed (simulating gateway)
router.put("/:id/complete", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { transactionId } = req.body

    await pool.query('UPDATE payments SET status = "completed", paymentDate = NOW(), transactionId = ? WHERE id = ?', [
      transactionId,
      req.params.id,
    ])

    res.json({ message: "Payment completed" })
  } catch (error) {
    res.status(500).json({ message: "Error completing payment", error: error.message })
  }
})

module.exports = router
