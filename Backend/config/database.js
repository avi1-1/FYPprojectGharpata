// MySQL database connection configuration
const mysql = require("mysql2/promise")
require("dotenv").config()

// Create connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "gharpata",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
})

// Test database connection and run auto-migrations
const testConnection = async () => {
    try {
        const connection = await pool.getConnection()
        console.log("✅ Database connected successfully")
        
        // Auto-migration: Add suspension column if it doesn't exist
        try {
            await connection.query("ALTER TABLE users ADD COLUMN suspendedUntil TIMESTAMP NULL DEFAULT NULL")
        } catch (err) {
            // Column already exists (error code 1060), ignore this error
            if (err.errno !== 1060 && err.code !== 'ER_DUP_FIELDNAME') {
                console.error("⚠️ Warning: Auto-migration for 'suspendedUntil' failed:", err.message)
            }
        }

        // Auto-migration: Create contract_requests table if it doesn't exist
        try {
            await connection.query(`
                CREATE TABLE IF NOT EXISTS contract_requests (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    bookingId INT NOT NULL,
                    type ENUM('renewal', 'termination') NOT NULL,
                    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                    requestDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    actionDate TIMESTAMP NULL DEFAULT NULL,
                    notes TEXT,
                    FOREIGN KEY (bookingId) REFERENCES bookings(id) ON DELETE CASCADE
                )
            `);
        } catch (err) {
            console.error("⚠️ Warning: Auto-migration for 'contract_requests' failed:", err.message);
        }

        connection.release()
    } catch (error) {
        console.error("❌ Database connection failed:", error.message)
        process.exit(1)
    }
}

module.exports = { pool, testConnection }
