const { pool } = require('../Backend/config/database');
require('dotenv').config({ path: '../Backend/.env' });

async function createTable() {
    try {
        const connection = await pool.getConnection();
        const query = `
            CREATE TABLE IF NOT EXISTS password_resets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                token VARCHAR(255) NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (email)
            )
        `;
        await connection.query(query);
        console.log("password_resets table created or already exists.");
        connection.release();
        process.exit(0);
    } catch (err) {
        console.error("Error creating table:", err);
        process.exit(1);
    }
}

createTable();
