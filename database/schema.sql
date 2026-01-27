-- Create Database
CREATE DATABASE IF NOT EXISTS gharpata;
USE gharpata;

-- Users Table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(15),
  address VARCHAR(255),
  role ENUM('tenant', 'landlord', 'admin') NOT NULL,
  idProof VARCHAR(255),
  isApproved BOOLEAN DEFAULT FALSE,
  profilePicture VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Properties Table
CREATE TABLE properties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  landlordId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  district VARCHAR(100),
  type ENUM('apartment', 'house', 'room', 'land') NOT NULL,
  bedrooms INT,
  bathrooms INT,
  area DECIMAL(10, 2),
  rentPrice DECIMAL(10, 2) NOT NULL,
  depositAmount DECIMAL(10, 2),
  amenities JSON,
  rules TEXT,
  images JSON,
  isApproved BOOLEAN DEFAULT FALSE,
  status ENUM('available', 'booked', 'under_maintenance') DEFAULT 'available',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (landlordId) REFERENCES users(id)
);

-- Bookings Table
CREATE TABLE bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  propertyId INT NOT NULL,
  tenantId INT NOT NULL,
  landlordId INT NOT NULL,
  moveInDate DATE NOT NULL,
  moveOutDate DATE,
  monthlyRent DECIMAL(10, 2),
  depositAmount DECIMAL(10, 2),
  agreementFile VARCHAR(255),
  status ENUM('pending', 'approved', 'rejected', 'active', 'completed') DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (propertyId) REFERENCES properties(id),
  FOREIGN KEY (tenantId) REFERENCES users(id),
  FOREIGN KEY (landlordId) REFERENCES users(id)
);

-- Payments Table
CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bookingId INT NOT NULL,
  tenantId INT NOT NULL,
  landlordId INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  paymentType ENUM('deposit', 'rent', 'maintenance') NOT NULL,
  paymentMethod ENUM('khalti', 'esewa', 'bank_transfer') DEFAULT 'khalti',
  transactionId VARCHAR(255) UNIQUE,
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  paymentDate TIMESTAMP,
  dueDate DATE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bookingId) REFERENCES bookings(id),
  FOREIGN KEY (tenantId) REFERENCES users(id),
  FOREIGN KEY (landlordId) REFERENCES users(id)
);

-- Complaints Table
CREATE TABLE complaints (
  id INT PRIMARY KEY AUTO_INCREMENT,
  bookingId INT NOT NULL,
  tenantId INT NOT NULL,
  landlordId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('maintenance', 'payment', 'behavior', 'other') NOT NULL,
  severity ENUM('low', 'medium', 'high') DEFAULT 'medium',
  images JSON,
  status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
  adminRemarks TEXT,
  resolution TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolvedAt TIMESTAMP NULL,
  FOREIGN KEY (bookingId) REFERENCES bookings(id),
  FOREIGN KEY (tenantId) REFERENCES users(id),
  FOREIGN KEY (landlordId) REFERENCES users(id)
);

-- Transactions Log Table
CREATE TABLE transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  type VARCHAR(50),
  description TEXT,
  amount DECIMAL(10, 2),
  paymentId INT,
  status VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (paymentId) REFERENCES payments(id)
);

-- Indexes for performance
CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_landlordId ON properties(landlordId);
CREATE INDEX idx_propertyId ON bookings(propertyId);
CREATE INDEX idx_tenantId ON bookings(tenantId);
CREATE INDEX idx_paymentStatus ON payments(status);
