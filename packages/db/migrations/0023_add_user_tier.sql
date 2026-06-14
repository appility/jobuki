-- Add tier column to users table
ALTER TABLE users ADD COLUMN tier text NOT NULL DEFAULT 'free';
-- Create enum for tier if needed (or just use text)
-- ALTER TYPE tier ADD VALUE 'pro';
-- ALTER TYPE tier ADD VALUE 'enterprise';
