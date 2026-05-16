-- Add durationYears to bookings
ALTER TABLE bookings ADD COLUMN durationYears INT;

-- Update status enum to include contract_agreed
ALTER TABLE bookings MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'contract_agreed', 'active', 'completed') DEFAULT 'pending';
