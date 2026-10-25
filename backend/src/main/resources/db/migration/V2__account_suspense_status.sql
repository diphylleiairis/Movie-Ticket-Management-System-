-- Apply after V1, before deploying the Admin user status update.
-- Existing accounts and verification rules are preserved.
BEGIN;
ALTER TABLE movie_app.users DROP CONSTRAINT users_status_check;
ALTER TABLE movie_app.users ADD CONSTRAINT users_status_check
    CHECK (status IN ('PENDING_VERIFICATION', 'ACTIVE', 'DISABLED', 'SUSPENSE'));
COMMIT;
