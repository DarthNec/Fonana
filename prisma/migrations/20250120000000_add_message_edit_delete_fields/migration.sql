-- Migration: Add isEdited and isDeleted fields to messages table
-- Date: 2025-01-20
-- Description: Adds two boolean fields to track if a message was edited or deleted

-- Add the new columns
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN messages."isEdited" IS 'Indicates if the message was edited by the sender';
COMMENT ON COLUMN messages."isDeleted" IS 'Indicates if the message was deleted by the sender (soft delete)';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('isEdited', 'isDeleted');

