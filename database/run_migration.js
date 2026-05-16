const fs = require('fs');
const path = require('path');
const { pool } = require('../Backend/config/database');
require('dotenv').config({ path: '../Backend/.env' });

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, 'migration_suspension.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split by ';' but be careful with statements.
        // For simplicity, let's just assume simple statements.
        const statements = sql.split(';').filter(stmt => stmt.trim() !== '');

        console.log('Running migration...');

        const connection = await pool.getConnection();

        for (const statement of statements) {
            console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
            await connection.query(statement.trim());
        }

        connection.release();
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
