-- Migration: Add conditional_rules column to application_type table
-- Date: October 28, 2025
-- Purpose: Support conditional logic for dynamic form fields

-- Add conditional_rules column (JSON array of conditional rules)
ALTER TABLE application_type ADD COLUMN conditional_rules TEXT DEFAULT '[]';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_application_type_conditional_rules 
ON application_type(conditional_rules);

-- Update existing records to have empty array
UPDATE application_type SET conditional_rules = '[]' WHERE conditional_rules IS NULL;

