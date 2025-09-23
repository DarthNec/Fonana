-- Add isEdited and isDeleted fields to messages table
ALTER TABLE messages 
ADD COLUMN "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

