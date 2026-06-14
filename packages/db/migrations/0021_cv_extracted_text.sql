ALTER TABLE candidate_profiles ADD COLUMN cv_extracted_text TEXT;
CREATE INDEX candidate_profiles_user_cv_idx ON candidate_profiles(user_id) WHERE cv_extracted_text IS NOT NULL;
