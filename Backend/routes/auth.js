const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
const multer = require("multer")
const path = require("path")

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/id_proofs"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const types = /jpeg|jpg|png|webp/
    if (types.test(file.mimetype) && types.test(path.extname(file.originalname).toLowerCase())) {
      return cb(null, true)
    }
    cb(new Error("Only images allowed"))
  }
})

// Routes
router.post("/register", upload.single("idProofImage"), authController.register)
router.post("/login", authController.login)
router.post("/google", authController.googleAuth)

module.exports = router
