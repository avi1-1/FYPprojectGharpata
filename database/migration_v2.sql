-- Add new columns to properties table
ALTER TABLE properties
ADD COLUMN facilities JSON DEFAULT NULL AFTER rules,
ADD COLUMN verificationDocuments JSON DEFAULT NULL AFTER images;
