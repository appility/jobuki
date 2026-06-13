-- Rename account_type enum values from job_seeker/job_poster to candidate/publisher
ALTER TYPE account_type RENAME VALUE 'job_seeker' TO 'candidate';
ALTER TYPE account_type RENAME VALUE 'job_poster' TO 'publisher';
