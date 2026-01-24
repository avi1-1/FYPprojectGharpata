const express = require("express")
const { auth } = require("../middleware/auth")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const router = express.Router()

// Multer Config for Profile Pictures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "public/uploads/profiles"
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`)
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/
    const mimetype = filetypes.test(file.mimetype)
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
    if (mimetype && extname) return cb(null, true)
    cb(new Error("Only images (jpeg, jpg, png, webp) are allowed"))
  },
})

// Get user profile
router.get("/profile", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const [users] = await pool.query(
      "SELECT id, name, email, phone, address, role, profilePicture FROM users WHERE id = ?",
      [req.user.id],
    )

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(users[0])
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile", error: error.message })
  }
})

// Get user's properties (landlord only)
router.get("/my-properties", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool

    if (req.user.role !== "landlord") {
      return res.status(403).json({ message: "Only landlords can view properties" })
    }

    const [properties] = await pool.query("SELECT * FROM properties WHERE landlordId = ? ORDER BY createdAt DESC", [
      req.user.id,
    ])
    res.json(properties)
  } catch (error) {
    console.error("My Properties Error:", error)
    const logData = `[${new Date().toISOString()}] GET /api/users/my-properties Error: ${error.message}\nStack: ${error.stack}\nUser: ${req.user ? req.user.id : 'none'}\n\n`;
    const fs = require('fs');
    try { fs.appendFileSync('server_error.log', logData); } catch (e) { }

    res.status(500).json({ message: "Error fetching properties", error: error.message })
  }
})

// Update user profile
router.put("/profile", auth, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { name, phone, address } = req.body

    await pool.query(
      "UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?",
      [name, phone, address, req.user.id]
    )

    res.json({ message: "Profile updated successfully" })
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error: error.message })
  }
})

// Upload profile picture
router.post("/profile-picture", auth, upload.single("profilePicture"), async (req, res) => {
  try {
    const pool = req.app.locals.pool
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    const profilePicture = req.file.filename

    // Optional: Delete old profile picture if exists
    const [user] = await pool.query("SELECT profilePicture FROM users WHERE id = ?", [req.user.id])
    if (user[0]?.profilePicture) {
      const oldPath = path.join("public/uploads/profiles", user[0].profilePicture)
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }

    await pool.query("UPDATE users SET profilePicture = ? WHERE id = ?", [profilePicture, req.user.id])

    res.json({
      message: "Profile picture updated",
      profilePicture: profilePicture
    })
  } catch (error) {
    res.status(500).json({ message: "Error uploading profile picture", error: error.message })
  }
})

module.exports = router
