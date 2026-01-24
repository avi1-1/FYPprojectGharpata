const express = require("express")
const multer = require("multer")
const path = require("path")
const { auth } = require("../middleware/auth")
const fs = require("fs")
const jwt = require("jsonwebtoken")
const router = express.Router()

// Configure Multer for Property Images
// Configure Multer for mixed storage (Property Images & Verification Documents)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = "public/uploads/properties"
    if (file.fieldname === "documents") {
      dir = "public/uploads/property-documents"
    }
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|pdf/
    const mimetype = filetypes.test(file.mimetype)
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
    if (mimetype && extname) {
      return cb(null, true)
    }
    cb(new Error("Only images (jpeg, jpg, png, webp) and PDF documents are allowed"))
  },
})

const propertyUpload = upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'documents', maxCount: 3 }
])

// Get all approved properties
router.get("/", async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const { city, priceMin, priceMax, bedrooms, type } = req.query

    let query = `
      SELECT id, landlordId, title, description, address, city, district, 
             type, bhkType, bedrooms, bathrooms, area, rentPrice, 
             depositAmount, amenities, facilities, rules, images, 
             isApproved, status, createdAt, updatedAt 
      FROM properties 
      WHERE isApproved = true AND status = "available"
    `
    const params = []

    if (city) {
      query += " AND city = ?"
      params.push(city)
    }
    if (priceMin) {
      query += " AND rentPrice >= ?"
      params.push(priceMin)
    }
    if (priceMax) {
      query += " AND rentPrice <= ?"
      params.push(priceMax)
    }
    if (bedrooms) {
      query += " AND bedrooms = ?"
      params.push(bedrooms)
    }
    if (type) {
      query += " AND type = ?"
      params.push(type)
    }

    const [properties] = await pool.query(query, params)
    res.json(properties)
  } catch (error) {
    console.error("Fetch Properties Error:", error)
    const logData = `[${new Date().toISOString()}] GET /api/properties Error: ${error.message}\nStack: ${error.stack}\n\n`;
    try { fs.appendFileSync('server_error.log', logData); } catch (e) { }

    res.status(500).json({ message: "Error fetching properties", error: error.message })
  }
})


// Get property by ID
router.get("/:id", async (req, res) => {
  try {
    const pool = req.app.locals.pool

    // Optional auth: check if user is logged in to allow viewing unapproved properties (admin/owner)
    let requesterId = null
    let requesterRole = null
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        requesterId = decoded.id
        requesterRole = decoded.role
      } catch (e) {
        // Token invalid, treat as guest
      }
    }

    const [properties] = await pool.query(
      "SELECT p.*, u.name as landlordName, u.phone as landlordPhone FROM properties p LEFT JOIN users u ON p.landlordId = u.id WHERE p.id = ?",
      [req.params.id],
    )

    if (properties.length === 0) {
      return res.status(404).json({ message: "Property not found" })
    }

    const property = properties[0]

    // Access control: only approved properties for guests/tenants
    // Admin and Owner can view unapproved ones
    if (!property.isApproved && requesterRole !== 'admin' && property.landlordId !== requesterId) {
      return res.status(403).json({ message: "Property is pending approval and you do not have permission to view it." })
    }

    // Sensitive data protection: only admin/owner can see verification documents
    if (requesterRole !== 'admin' && property.landlordId !== requesterId) {
      delete property.verificationDocuments
    }

    res.json(property)
  } catch (error) {
    console.error("Fetch Property Detail Error:", error)
    const logData = `[${new Date().toISOString()}] GET /api/properties/${req.params.id} Error: ${error.message}\nStack: ${error.stack}\n\n`;
    try { fs.appendFileSync('server_error.log', logData); } catch (e) { }

    res.status(500).json({ message: "Error fetching property", error: error.message })
  }
})

// Helper to handle JSON fields that might be strings or objects
const ensureJSON = (val) => {
  if (!val) return JSON.stringify([])
  if (typeof val === 'string') {
    try {
      JSON.parse(val)
      return val // already a valid JSON string
    } catch (e) {
      return JSON.stringify(val) // string but not JSON
    }
  }
  return JSON.stringify(val)
}

// Create property (landlord only)
router.post("/", auth, propertyUpload, async (req, res) => {
  try {
    if (req.user.role !== "landlord") {
      return res.status(403).json({ message: "Only landlords can create properties" })
    }

    const pool = req.app.locals.pool
    const {
      title, description, address, city, district, type, bedrooms, bathrooms,
      area, rentPrice, depositAmount, amenities, facilities, bhkType, rules
    } = req.body

    const imageFilenames = req.files && req.files['images'] ? req.files['images'].map((file) => file.filename) : []
    const docFilenames = req.files && req.files['documents'] ? req.files['documents'].map((file) => file.filename) : []

    await pool.query(
      "INSERT INTO properties (landlordId, title, description, address, city, district, type, bhkType, bedrooms, bathrooms, area, rentPrice, depositAmount, amenities, facilities, rules, images, verificationDocuments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        req.user.id, title, description, address, city, district, type, bhkType || null,
        bedrooms, bathrooms, area, rentPrice, depositAmount,
        ensureJSON(amenities), ensureJSON(facilities), rules,
        JSON.stringify(imageFilenames), JSON.stringify(docFilenames)
      ],
    )

    res.status(201).json({ message: "Property created successfully, pending admin approval" })
  } catch (error) {
    console.error("Create Property Error:", error)
    const logData = `[${new Date().toISOString()}] POST /api/properties Error: ${error.message}\nStack: ${error.stack}\n\n`;
    try { fs.appendFileSync('server_error.log', logData); } catch (e) { }
    res.status(500).json({ message: "Error creating property", error: error.message })
  }
})

// Update property
router.put("/:id", auth, propertyUpload, async (req, res) => {
  try {
    const pool = req.app.locals.pool
    const [properties] = await pool.query("SELECT * FROM properties WHERE id = ?", [req.params.id])

    if (properties.length === 0 || properties[0].landlordId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" })
    }

    const {
      title, description, address, city, district, type, bedrooms, bathrooms,
      area, rentPrice, depositAmount, amenities, facilities, bhkType, rules, status
    } = req.body

    // If new images are uploaded, use them. Otherwise, keep existing images.
    let imageFilenames = properties[0].images
    if (req.files && req.files['images'] && req.files['images'].length > 0) {
      imageFilenames = req.files['images'].map((file) => file.filename)
    }

    // Handle documents similarly
    let docFilenames = properties[0].verificationDocuments
    if (req.files && req.files['documents'] && req.files['documents'].length > 0) {
      docFilenames = req.files['documents'].map((file) => file.filename)
    }

    await pool.query(
      "UPDATE properties SET title = ?, description = ?, address = ?, city = ?, district = ?, type = ?, bhkType = ?, bedrooms = ?, bathrooms = ?, area = ?, rentPrice = ?, depositAmount = ?, amenities = ?, facilities = ?, rules = ?, images = ?, verificationDocuments = ?, status = ? WHERE id = ?",
      [
        title, description, address, city, district, type, bhkType || null,
        bedrooms, bathrooms, area, rentPrice, depositAmount,
        ensureJSON(amenities), ensureJSON(facilities), rules,
        typeof imageFilenames === 'string' ? imageFilenames : JSON.stringify(imageFilenames),
        typeof docFilenames === 'string' ? docFilenames : JSON.stringify(docFilenames),
        status || properties[0].status, req.params.id
      ],
    )

    res.json({ message: "Property updated successfully" })
  } catch (error) {
    console.error("Update Property Error:", error)
    const logData = `[${new Date().toISOString()}] PUT /api/properties/${req.params.id} Error: ${error.message}\nStack: ${error.stack}\n\n`;
    try { fs.appendFileSync('server_error.log', logData); } catch (e) { }
    res.status(500).json({ message: "Error updating property", error: error.message })
  }
})

module.exports = router
