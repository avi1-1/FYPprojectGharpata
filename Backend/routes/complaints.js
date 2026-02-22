// Complaint management system for tenant-landlord disputes
const express = require("express")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Define valid status transitions for different user roles
const VALID_TRANSITIONS = {
  LANDLORD_TARGET: { // Landlord being complained against
    PENDING: ["IN_PROGRESS", "REJECTED"],
    IN_PROGRESS: ["RESOLVED"],
  },
  LANDLORD_FILER: { // Landlord who filed a complaint against a tenant
    PENDING: ["IN_PROGRESS", "REJECTED", "CLOSED"],
    IN_PROGRESS: ["RESOLVED", "CLOSED", "REJECTED"],
    RESOLVED: ["CLOSED", "REJECTED"],
  },
  TENANT_FILER: { // Tenant who filed a complaint against a landlord
    RESOLVED: ["CLOSED", "ESCALATED"],
  },
  TENANT_TARGET: { // Tenant being complained against (Can respond but not resolve)
    PENDING: [],
    IN_PROGRESS: [],
  },
  ADMIN: {
    PENDING: ["FORCE_RESOLVED", "REJECTED", "WARNING_ISSUED", "ACCOUNT_SUSPENDED", "ESCALATED", "IN_PROGRESS", "RESOLVED", "CLOSED"],
    IN_PROGRESS: ["FORCE_RESOLVED", "REJECTED", "WARNING_ISSUED", "ACCOUNT_SUSPENDED", "RESOLVED", "CLOSED"],
    RESOLVED: ["FORCE_RESOLVED", "CLOSED", "WARNING_ISSUED", "ACCOUNT_SUSPENDED"],
    ESCALATED: ["FORCE_RESOLVED", "REJECTED", "WARNING_ISSUED", "ACCOUNT_SUSPENDED", "RESOLVED", "CLOSED"],
    REJECTED: ["FORCE_RESOLVED", "WARNING_ISSUED"],
    CLOSED: ["FORCE_RESOLVED"],
  },
}

// Create complaint by tenant against landlord
router.post("/", auth, async (req, res) => {
  try {
    // Only tenants can use this endpoint
    if (req.user.role !== "tenant") {
      return res.status(403).json({ message: "Only tenants can use this endpoint. Landlords use /landlord" })
    }

    const pool = req.app.locals.pool
    const { bookingId, title, description, category, severity } = req.body

    // Validate required fields
    if (!bookingId || !title || !description || !category) {
      return res.status(400).json({ message: "bookingId, title, description, and category are required" })
    }

    // Verify tenant has active booking for this property
    const [bookings] = await pool.query(
      "SELECT * FROM bookings WHERE id = ? AND tenantId = ? AND status IN ('approved','active','contract_agreed')",
      [bookingId, req.user.id]
    )
    if (bookings.length === 0) {
      return res.status(404).json({ message: "No active booking found. You must have an approved booking to file a complaint." })
    }

    const booking = bookings[0]

    // Insert complaint into database
    const [result] = await pool.query(
      `INSERT INTO complaints
        (bookingId, tenantId, landlordId, filedBy, filedAgainst, title, description, category, severity, status, comments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', '[]')`,
      [bookingId, req.user.id, booking.landlordId, req.user.id, booking.landlordId, title, description, category, severity || "medium"]
    )

    res.status(201).json({ message: "Complaint submitted successfully", complaintId: result.insertId })
  } catch (error) {
    console.error("Error creating complaint:", error)
    res.status(500).json({ message: "Error creating complaint", error: error.message })
  }
})

// Create complaint by landlord against tenant
router.post("/landlord", auth, async (req, res) => {
  try {
    // Only landlords can use this endpoint
    if (req.user.role !== "landlord") {
      return res.status(403).json({ message: "Only landlords can use this endpoint" })
    }

    const pool = req.app.locals.pool
    const { bookingId, title, description, category, severity } = req.body

    if (!bookingId || !title || !description || !category) {
      return res.status(400).json({ message: "bookingId, title, description, and category are required" })
    }

    // Validate booking belongs to this landlord
    const [bookings] = await pool.query(
      "SELECT b.*, p.landlordId FROM bookings b JOIN properties p ON b.propertyId = p.id WHERE b.id = ? AND p.landlordId = ? AND b.status IN ('approved','active','contract_agreed')",
      [bookingId, req.user.id]
    )
    if (bookings.length === 0) {
      return res.status(404).json({ message: "No active booking found for this tenancy." })
    }

    const booking = bookings[0]

    const [result] = await pool.query(
      `INSERT INTO complaints
        (bookingId, tenantId, landlordId, filedBy, filedAgainst, title, description, category, severity, status, comments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', '[]')`,
      [bookingId, booking.tenantId, req.user.id, req.user.id, booking.tenantId, title, description, category, severity || "medium"]
    )

    res.status(201).json({ message: "Complaint filed against tenant", complaintId: result.insertId })
  } catch (error) {
    console.error("Error creating landlord complaint:", error)
    res.status(500).json({ message: "Error creating complaint", error: error.message })
  }
})

// ─── GET /api/complaints ──────────────────────────────────────────────────
// Role-scoped: tenant=own, landlord=their tenants', admin=all
router.get("/", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    let complaints = []

    if (req.user.role === "admin") {
      const [rows] = await pool.query(`
        SELECT c.*,
          t.name AS tenantName, t.email AS tenantEmail,
          l.name AS landlordName, l.email AS landlordEmail,
          fb.name AS filedByName, fb.role AS filedByRole,
          fa.name AS filedAgainstName, fa.role AS filedAgainstRole
        FROM \`complaints\` c
        JOIN \`users\` t ON c.\`tenantId\` = t.\`id\`
        JOIN \`users\` l ON c.\`landlordId\` = l.id
        LEFT JOIN \`users\` fb ON c.\`filedBy\` = fb.\`id\`
        LEFT JOIN \`users\` fa ON c.\`filedAgainst\` = fa.\`id\`
        ORDER BY c.\`createdAt\` DESC
      `)
      complaints = rows
    } else if (req.user.role === "landlord") {
      const [rows] = await pool.query(`
        SELECT c.*,
          t.name AS tenantName, t.email AS tenantEmail,
          fb.name AS filedByName, fb.role AS filedByRole,
          fa.name AS filedAgainstName
        FROM \`complaints\` c
        JOIN \`users\` t ON c.\`tenantId\` = t.\`id\`
        LEFT JOIN \`users\` fb ON c.\`filedBy\` = fb.\`id\`
        LEFT JOIN \`users\` fa ON c.\`filedAgainst\` = fa.\`id\`
        WHERE c.\`landlordId\` = ?
        ORDER BY c.\`createdAt\` DESC
      `, [req.user.id])
      complaints = rows
    } else {
      // tenant – only their own complaints
      const [rows] = await pool.query(`
        SELECT c.*,
          l.name AS landlordName,
          fb.name AS filedByName, fb.role AS filedByRole,
          fa.name AS filedAgainstName
        FROM \`complaints\` c
        JOIN \`users\` l ON c.\`landlordId\` = l.\`id\`
        LEFT JOIN \`users\` fb ON c.\`filedBy\` = fb.\`id\`
        LEFT JOIN \`users\` fa ON c.\`filedAgainst\` = fa.\`id\`
        WHERE c.\`tenantId\` = ?
        ORDER BY c.\`createdAt\` DESC
      `, [req.user.id])
      complaints = rows
    }

    // Parse JSON fields
    complaints = complaints.map(c => ({
      ...c,
      comments: safeParseJSON(c.comments, []),
    }))

    res.json(complaints)
  } catch (error) {
    console.error("Error fetching complaints:", error)
    res.status(500).json({ message: "Error fetching complaints", error: error.message })
  }
})

// ─── GET /api/complaints/:id ──────────────────────────────────────────────
router.get("/:id", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool

    const [rows] = await pool.query(`
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
      WHERE c.id = ?
    `, [req.params.id])

    if (rows.length === 0) return res.status(404).json({ message: "Complaint not found" })

    const complaint = rows[0]

    // Access control
    if (req.user.role === "tenant" && complaint.tenantId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" })
    }
    if (req.user.role === "landlord" && complaint.landlordId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" })
    }

    complaint.comments = safeParseJSON(complaint.comments, [])
    res.json(complaint)
  } catch (error) {
    res.status(500).json({ message: "Error fetching complaint", error: error.message })
  }
})

// ─── PUT /api/complaints/:id/status ──────────────────────────────────────
router.put("/:id/status", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { status, rejectionReason, resolution, adminRemarks } = req.body
    const userRole = req.user.role
    const userId = req.user.id

    if (!status) return res.status(400).json({ message: "status is required" })

    const [complaints] = await pool.query("SELECT * FROM complaints WHERE id = ?", [req.params.id])
    if (complaints.length === 0) return res.status(404).json({ message: "Complaint not found" })

    const complaint = complaints[0]
    const currentStatus = complaint.status

    let transitionContext = null
    if (userRole === "admin") {
      transitionContext = "ADMIN"
    } else if (userRole === "landlord") {
      transitionContext = (userId == complaint.filedBy) ? "LANDLORD_FILER" : "LANDLORD_TARGET"
    } else if (userRole === "tenant") {
      transitionContext = (userId == complaint.filedBy) ? "TENANT_FILER" : "TENANT_TARGET"
    }

    if (!transitionContext || (userRole !== 'admin' && userId != complaint.filedBy && userId != complaint.filedAgainst)) {
      return res.status(403).json({ message: "You are not an authorized party to this complaint" })
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[transitionContext]?.[currentStatus] || []
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Transition from '${currentStatus}' to '${status}' is not allowed for you.`,
        allowed,
      })
    }

    // Rejection requires a reason
    if (status === "REJECTED" && !rejectionReason) {
      return res.status(400).json({ message: "A rejectionReason is required" })
    }

    const resolvedAt = ["RESOLVED", "CLOSED", "FORCE_RESOLVED"].includes(status) ? new Date() : null

    await pool.query(
      `UPDATE complaints
       SET status = ?, rejectionReason = ?, resolution = ?, adminRemarks = ?, resolvedAt = ?, updatedAt = NOW()
       WHERE id = ?`,
      [status, rejectionReason || null, resolution || null, adminRemarks || null, resolvedAt, req.params.id]
    )

    res.json({ message: `Complaint status updated to ${status}` })
  } catch (error) {
    console.error("Error updating complaint status:", error)
    res.status(500).json({ message: "Error updating complaint", error: error.message })
  }
})

// ─── POST /api/complaints/:id/comment ────────────────────────────────────
router.post("/:id/comment", auth, async (req, res) => {
  const compId = req.params.id;
  console.log(`[Complaints API] Processing comment for ID: ${compId} | User: ${req.user.role}`);
  try {
    const pool = req.app.locals.pool
    const { comment } = req.body

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: "Comment text is required" })
    }

    const [complaints] = await pool.query("SELECT * FROM complaints WHERE id = ?", [req.params.id])
    if (complaints.length === 0) {
      console.warn(`[Complaints API] Complaint with ID ${req.params.id} not found for comment`);
      return res.status(404).json({ message: "Complaint not found" })
    }

    const complaint = complaints[0]

    // Access control: only involved parties
    if (req.user.role === "tenant" && complaint.tenantId !== req.user.id) {
      return res.status(403).json({ message: "Access denied: Not your complaint" })
    }
    if (req.user.role === "landlord" && complaint.landlordId !== req.user.id) {
      return res.status(403).json({ message: "Access denied: Not your tenant's complaint" })
    }

    // Get user name
    const [users] = await pool.query("SELECT name FROM users WHERE id = ?", [req.user.id])
    const userName = users[0]?.name || "Unknown"

    const currentComments = safeParseJSON(complaint.comments, [])
    currentComments.push({
      userId: req.user.id,
      role: req.user.role,
      name: userName,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    })

    await pool.query(
      "UPDATE complaints SET comments = ?, updatedAt = NOW() WHERE id = ?",
      [JSON.stringify(currentComments), req.params.id]
    )

    console.log(`[Complaints API] Comment added to complaint ${req.params.id} by ${userName}`);
    res.json({ message: "Comment added", comments: currentComments })
  } catch (error) {
    console.error("Error adding comment:", error)
    res.status(500).json({ message: "Error adding comment", error: error.message })
  }
})

// ─── Helper ───────────────────────────────────────────────────────────────
function safeParseJSON(value, fallback) {
  try {
    if (typeof value === "string") return JSON.parse(value)
    if (Array.isArray(value) || typeof value === "object") return value || fallback
    return fallback
  } catch {
    return fallback
  }
}

module.exports = router
