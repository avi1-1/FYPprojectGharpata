-- GharPata Complaint System - Migration v2
-- Run this ONCE against your gharpata database
-- It upgrades the complaints table to support the full role-based complaint system

USE gharpata;

-- Step 1: Add new columns (safe to add even if data exists)
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS filedBy INT NULL AFTER landlordId,
  ADD COLUMN IF NOT EXISTS filedAgainst INT NULL AFTER filedBy,
  ADD COLUMN IF NOT EXISTS rejectionReason TEXT NULL AFTER resolution,
  ADD COLUMN IF NOT EXISTS comments JSON NULL AFTER rejectionReason,
  ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER resolvedAt;

-- Step 2: Backfill filedBy and filedAgainst from existing data (tenant filed against landlord)
UPDATE complaints SET filedBy = tenantId, filedAgainst = landlordId WHERE filedBy IS NULL;

-- Step 3: Add foreign keys for the new columns
ALTER TABLE complaints
  ADD CONSTRAINT fk_complaints_filedBy FOREIGN KEY (filedBy) REFERENCES users(id),
  ADD CONSTRAINT fk_complaints_filedAgainst FOREIGN KEY (filedAgainst) REFERENCES users(id);

-- Step 4: Expand the status ENUM to include all required statuses
-- MySQL requires re-defining the full ENUM
ALTER TABLE complaints
  MODIFY COLUMN status ENUM(
    'PENDING',
    'IN_PROGRESS',
    'RESOLVED',
    'REJECTED',
    'ESCALATED',
    'CLOSED',
    'FORCE_RESOLVED',
    'WARNING_ISSUED',
    'ACCOUNT_SUSPENDED'
  ) DEFAULT 'PENDING';

-- Step 5: Migrate old status values to new uppercase equivalents
UPDATE complaints SET status = 'PENDING'     WHERE status = 'open';
UPDATE complaints SET status = 'IN_PROGRESS' WHERE status = 'in_progress';
UPDATE complaints SET status = 'RESOLVED'    WHERE status = 'resolved';
UPDATE complaints SET status = 'CLOSED'      WHERE status = 'closed';

-- Step 6: Expand category ENUM to include noise and harassment
ALTER TABLE complaints
  MODIFY COLUMN category ENUM('maintenance', 'payment', 'behavior', 'noise', 'harassment', 'other') NOT NULL;

-- Done
SELECT 'Migration v2 complete' AS result;
