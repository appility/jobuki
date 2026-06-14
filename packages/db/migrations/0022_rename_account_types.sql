-- Rename account_type enum values
ALTER TYPE account_type RENAME VALUE 'job_seeker' TO 'candidate';
ALTER TYPE account_type RENAME VALUE 'job_poster' TO 'publisher';
-- Note: board_creator already exists, no change needed
