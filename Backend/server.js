const express = require("express")
const cors = require("cors")
require("dotenv").config()

const { pool, testConnection } = require("./config/database")

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use("/uploads", express.static("public/uploads"))
app.use("/uploads/profiles", express.static("public/uploads/profiles"))

// Request logging middleware
app.use((req, res, next) => {
  res.set("X-GharPata-Debug", "True")
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Make pool accessible to routes
app.locals.pool = pool

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "GharPata Server Running", port: process.env.PORT || 5000 })
})

app.get("/debug/pool", (req, res) => {
  res.json({
    poolExists: !!app.locals.pool,
    poolType: typeof app.locals.pool,
    timestamp: new Date().toISOString()
  })
})

// API Routes
app.use("/api/auth", require("./routes/auth"))
app.use("/api/properties", require("./routes/properties"))
app.use("/api/bookings", require("./routes/bookings"))
app.use("/api/payments", require("./routes/payments"))
app.use("/api/complaints", require("./routes/complaints"))
app.use("/api/admin", require("./routes/admin"))
app.use("/api/users", require("./routes/users"))

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack)

  // Log to file for deep diagnosis
  const fs = require('fs');
  const logData = `[${new Date().toISOString()}] GLOBAL ERROR: ${err.message}\nStack: ${err.stack}\nURL: ${req.url}\n\n`;
  try {
    fs.appendFileSync('server_error.log', logData);
  } catch (e) { }

  res.status(500).json({ message: "Internal server error", error: err.message })
})

const PORT = process.env.PORT || 5000

// Test database connection then start server
testConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`\n GharPata Backend Server running on http://localhost:${PORT}`)
    console.log(` Health check: http://localhost:${PORT}/health`)
    console.log(` API Base URL: http://localhost:${PORT}/api\n`)
  })
})

module.exports = app
