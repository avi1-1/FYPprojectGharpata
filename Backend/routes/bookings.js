// Booking management routes for rental agreements
const express = require("express")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Create new booking request (tenant only)
router.post("/", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { propertyId, moveInDate, moveOutDate, monthlyRent, depositAmount, durationYears } = req.body

    // Only tenants can create bookings
    if (req.user.role !== "tenant") {
      return res.status(403).json({ message: "Only tenants can create bookings" })
    }

    // Validate move-in date is not in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const moveIn = new Date(moveInDate)
    if (moveIn < today) {
      return res.status(400).json({ message: "Move-in date cannot be in the past" })
    }

    // Get property details and verify it exists
    const [properties] = await pool.query("SELECT * FROM properties WHERE id = ?", [propertyId])
    if (properties.length === 0) {
      return res.status(404).json({ message: "Property not found" })
    }

    const landlordId = properties[0].landlordId

    // Calculate move-out date if not provided
    let computedMoveOutDate = moveOutDate
    if (!moveOutDate && moveInDate && durationYears) {
      const date = new Date(moveInDate)
      date.setFullYear(date.getFullYear() + parseInt(durationYears))
      computedMoveOutDate = date.toISOString().split("T")[0]
    }

    // Insert booking request into database
    const [result] = await pool.query(
      "INSERT INTO bookings (propertyId, tenantId, landlordId, moveInDate, moveOutDate, monthlyRent, depositAmount, durationYears, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        propertyId,
        req.user.id,
        landlordId,
        moveInDate,
        computedMoveOutDate,
        monthlyRent,
        depositAmount,
        durationYears || null,
        "pending", // Initial status
      ],
    )

    res.status(201).json({ message: "Booking created successfully", bookingId: result.insertId })
  } catch (error) {
    res.status(500).json({ message: "Error creating booking", error: error.message })
  }
})

// Get user's bookings (tenant or landlord)
router.get("/user/:userId", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    // Fetch bookings with property and user details
    const [bookings] = await pool.query(
      "SELECT b.*, p.title, p.address as propertyAddress, p.images, p.type, p.bedrooms, u.name AS landlordName, u.email AS landlordEmail, u.phone AS landlordPhone, ut.name AS tenantName, ut.email AS tenantEmail, ut.phone AS tenantPhone, ut.profilePicture AS tenantProfilePic FROM bookings b JOIN properties p ON b.propertyId = p.id JOIN users u ON b.landlordId = u.id JOIN users ut ON b.tenantId = ut.id WHERE (b.tenantId = ? OR b.landlordId = ?)",
      [req.user.id, req.user.id],
    )

    res.json(bookings)
  } catch (error) {
    res.status(500).json({ message: "Error fetching bookings", error: error.message })
  }
})

// Update booking status (landlord only)
router.put("/:id/status", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { status } = req.body

    // Verify booking belongs to this landlord
    const [bookings] = await pool.query("SELECT * FROM bookings WHERE id = ?", [req.params.id])
    if (bookings.length === 0 || bookings[0].landlordId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    // Update booking status
    await pool.query("UPDATE bookings SET status = ? WHERE id = ?", [status, req.params.id])

    // If approved, mark property as booked
    if (status === "approved") {
      await pool.query('UPDATE properties SET status = "booked" WHERE id = ?', [bookings[0].propertyId])
    }

    res.json({ message: `Booking ${status}` })
  } catch (error) {
    res.status(500).json({ message: "Error updating booking", error: error.message })
  }
})

// Tenant agrees to rental contract
router.put("/:id/contract/agree", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    console.log(`Agreeing to contract for booking ${req.params.id}`);

    const [bookings] = await pool.query("SELECT * FROM bookings WHERE id = ?", [req.params.id])
    if (bookings.length === 0) {
      return res.status(404).json({ message: "Booking not found" })
    }

    if (bookings[0].tenantId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    if (bookings[0].status !== "approved") {
      return res.status(400).json({ message: "Contract relies on approved booking" })
    }

    await pool.query('UPDATE bookings SET status = "contract_agreed" WHERE id = ?', [req.params.id])

    res.json({ message: "Contract agreed successfully" })
  } catch (error) {
    res.status(500).json({ message: "Error agreeing to contract", error: error.message })
  }
})

// Create a contract request (Renewal / Termination)
router.post("/:id/contract-request", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { type, notes, renewalYears, requestedVacateDate } = req.body

    const [bookings] = await pool.query("SELECT * FROM bookings WHERE id = ?", [req.params.id])
    if (bookings.length === 0) {
      return res.status(404).json({ message: "Booking not found" })
    }

    if (bookings[0].tenantId !== req.user.id) {
      return res.status(403).json({ message: "Only the tenant can request contract changes" })
    }

    if (bookings[0].status !== "active") {
      return res.status(400).json({ message: "Can only request changes for active bookings" })
    }

    await pool.query(
      "INSERT INTO contract_requests (bookingId, tenantId, landlordId, type, status, reason, renewalYears, requestedVacateDate) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)",
      [req.params.id, bookings[0].tenantId, bookings[0].landlordId, type, notes, renewalYears || null, requestedVacateDate || null]
    )

    res.status(201).json({ message: `${type} request submitted successfully` })
  } catch (error) {
    res.status(500).json({ message: "Error submitting contract request", error: error.message })
  }
})

// Get contract requests (for user, landlord, or admin)
router.get("/contract-requests/all", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    let query = `
      SELECT cr.*, b.propertyId, b.tenantId, b.landlordId, p.title as propertyTitle, 
      t.name as tenantName, l.name as landlordName 
      FROM contract_requests cr
      JOIN bookings b ON cr.bookingId = b.id
      JOIN properties p ON b.propertyId = p.id
      JOIN users t ON b.tenantId = t.id
      JOIN users l ON b.landlordId = l.id
    `;
    let params = [];

    if (req.user.role === "tenant") {
      query += " WHERE b.tenantId = ?";
      params.push(req.user.id);
    } else if (req.user.role === "landlord") {
      query += " WHERE b.landlordId = ?";
      params.push(req.user.id);
    }
    
    query += " ORDER BY cr.createdAt DESC";

    const [requests] = await pool.query(query, params)
    res.json(requests)
  } catch (error) {
    console.error("CONTRACT REQUESTS FETCH ERROR:", error);
    res.status(500).json({ message: "Error fetching contract requests", error: error.message })
  }
})

// Update contract request status
router.put("/contract-request/:requestId", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { status } = req.body // 'approved' or 'rejected'

    const [requests] = await pool.query(
      "SELECT cr.*, b.landlordId, b.propertyId FROM contract_requests cr JOIN bookings b ON cr.bookingId = b.id WHERE cr.id = ?", 
      [req.params.requestId]
    )

    if (requests.length === 0) {
      return res.status(404).json({ message: "Request not found" })
    }

    const request = requests[0];

    // Only landlord or admin can approve/reject
    if (req.user.role !== "admin" && request.landlordId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    await pool.query(
      "UPDATE contract_requests SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [status, req.params.requestId]
    )

    if (status === "approved") {
      if (request.type === "termination") {
        const vacateDateStr = request.requestedVacateDate ? 
          `'${new Date(request.requestedVacateDate).toISOString().split('T')[0]}'` : 
          'CURRENT_DATE()';
        
        await pool.query(`UPDATE bookings SET status = 'terminated', moveOutDate = ${vacateDateStr} WHERE id = ?`, [request.bookingId])
        await pool.query("UPDATE properties SET status = 'available' WHERE id = ?", [request.propertyId])
        // Refunds can be processed here via payments API or logic
      } else if (request.type === "renewal") {
        const years = request.renewalYears || 1;
        await pool.query(`UPDATE bookings SET moveOutDate = DATE_ADD(moveOutDate, INTERVAL ${years} YEAR) WHERE id = ?`, [request.bookingId])
      }
    }

    res.json({ message: `Request ${status} successfully` })
  } catch (error) {
    res.status(500).json({ message: "Error updating request", error: error.message })
  }
})

module.exports = router
