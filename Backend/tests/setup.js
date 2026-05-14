// Jest global setup – runs BEFORE every test file
// Sets environment variables that the app reads at module load time

process.env.JWT_SECRET = 'test_secret';
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'root';
process.env.DB_PASSWORD = '';
process.env.DB_NAME = 'gharpata';
