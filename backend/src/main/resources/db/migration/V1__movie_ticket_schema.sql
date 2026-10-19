-- Supabase SQL Editor / PostgreSQL migration. Run once on an empty application schema.
-- Spring Boot owns authentication; browser clients have no direct database access.
BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
CREATE SCHEMA movie_app;
SET LOCAL search_path = movie_app, extensions, public;

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL CHECK (email = lower(btrim(email)) AND position('@' in email) > 1),
    password_hash text,
    full_name text NOT NULL CHECK (btrim(full_name) <> ''),
    phone text,
    role text NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN', 'CINEMA_STAFF')),
    status text NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION', 'ACTIVE', 'DISABLED')),
    email_verified_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (email),
    CHECK (status <> 'ACTIVE' OR role <> 'CUSTOMER' OR email_verified_at IS NOT NULL),
    CHECK (password_hash IS NULL OR btrim(password_hash) <> '')
);

CREATE TABLE user_identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    provider text NOT NULL CHECK (provider IN ('GOOGLE', 'APPLE')),
    provider_subject text NOT NULL CHECK (btrim(provider_subject) <> ''),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_subject),
    UNIQUE (user_id, provider)
);

CREATE TABLE email_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    target_email text NOT NULL CHECK (target_email = lower(btrim(target_email)) AND position('@' in target_email) > 1),
    purpose text NOT NULL CHECK (purpose IN ('REGISTRATION', 'EMAIL_CHANGE')),
    token_hash text NOT NULL CHECK (btrim(token_hash) <> ''),
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    superseded_at timestamptz,
    failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX email_verifications_one_open ON email_verifications(user_id, purpose)
    WHERE consumed_at IS NULL AND superseded_at IS NULL;

CREATE TABLE password_reset_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    verified_email_snapshot text NOT NULL,
    token_hash text NOT NULL UNIQUE CHECK (btrim(token_hash) <> ''),
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (expires_at > created_at)
);

CREATE TABLE movies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE CHECK (btrim(slug) <> ''),
    title text NOT NULL CHECK (btrim(title) <> ''),
    description text NOT NULL,
    duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
    age_rating text NOT NULL,
    poster_url text NOT NULL,
    release_date date,
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE genres (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE CHECK (btrim(name) <> ''),
    slug text NOT NULL UNIQUE CHECK (btrim(slug) <> '')
);
CREATE TABLE movie_genres (
    movie_id uuid NOT NULL REFERENCES movies(id),
    genre_id uuid NOT NULL REFERENCES genres(id),
    PRIMARY KEY (movie_id, genre_id)
);

CREATE TABLE locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (btrim(name) <> ''),
    code text NOT NULL UNIQUE CHECK (btrim(code) <> '')
);
CREATE TABLE cinemas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id uuid NOT NULL REFERENCES locations(id),
    name text NOT NULL CHECK (btrim(name) <> ''),
    address text NOT NULL,
    check_in_opens_before_minutes integer NOT NULL CHECK (check_in_opens_before_minutes >= 0),
    check_in_closes_after_minutes integer NOT NULL CHECK (check_in_closes_after_minutes >= 0),
    UNIQUE (location_id, name)
);
CREATE TABLE seat_layouts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE CHECK (btrim(name) <> ''),
    description text
);
CREATE TABLE seat_layout_positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    seat_layout_id uuid NOT NULL REFERENCES seat_layouts(id),
    seat_code text NOT NULL CHECK (btrim(seat_code) <> ''),
    row_label text NOT NULL,
    column_number integer NOT NULL CHECK (column_number > 0),
    position_x numeric(10,2) NOT NULL CHECK (position_x >= 0),
    position_y numeric(10,2) NOT NULL CHECK (position_y >= 0),
    UNIQUE (seat_layout_id, seat_code),
    UNIQUE (seat_layout_id, row_label, column_number),
    UNIQUE (id, seat_layout_id, seat_code)
);
CREATE TABLE halls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cinema_id uuid NOT NULL REFERENCES cinemas(id),
    seat_layout_id uuid NOT NULL REFERENCES seat_layouts(id),
    name text NOT NULL CHECK (btrim(name) <> ''),
    layout_locked_at timestamptz,
    UNIQUE (cinema_id, name),
    UNIQUE (id, seat_layout_id)
);
CREATE TABLE seats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_id uuid NOT NULL,
    seat_layout_id uuid NOT NULL,
    seat_layout_position_id uuid NOT NULL,
    seat_code text NOT NULL,
    FOREIGN KEY (hall_id, seat_layout_id) REFERENCES halls(id, seat_layout_id),
    FOREIGN KEY (seat_layout_position_id, seat_layout_id, seat_code)
        REFERENCES seat_layout_positions(id, seat_layout_id, seat_code),
    UNIQUE (hall_id, seat_code),
    UNIQUE (hall_id, seat_layout_position_id),
    UNIQUE (id, hall_id)
);

CREATE TABLE showtimes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id uuid NOT NULL REFERENCES movies(id),
    hall_id uuid NOT NULL REFERENCES halls(id),
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    buffer_ends_at timestamptz NOT NULL,
    base_price numeric(14,2) NOT NULL CHECK (base_price > 0),
    currency text NOT NULL DEFAULT 'VND' CHECK (currency ~ '^[A-Z]{3}$'),
    status text NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT', 'PUBLISHED', 'REMOVED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, hall_id),
    CHECK (ends_at > starts_at AND buffer_ends_at = ends_at + interval '15 minutes'),
    CONSTRAINT showtimes_no_overlap EXCLUDE USING gist (
        hall_id WITH =, tstzrange(starts_at, buffer_ends_at, '[)') WITH &&
    ) WHERE (status <> 'REMOVED')
);

CREATE TABLE bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES users(id),
    showtime_id uuid NOT NULL REFERENCES showtimes(id),
    status text NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'EXPIRED', 'CANCELLED', 'CONFIRMED', 'REVERSAL_PENDING', 'REVERSED')),
    seat_count integer NOT NULL CHECK (seat_count BETWEEN 1 AND 10),
    hold_started_at timestamptz NOT NULL,
    hold_expires_at timestamptz NOT NULL,
    total_amount numeric(14,2) NOT NULL CHECK (total_amount > 0),
    currency text NOT NULL DEFAULT 'VND' CHECK (currency ~ '^[A-Z]{3}$'),
    confirmed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, showtime_id),
    CHECK (hold_expires_at = hold_started_at + interval '10 minutes'),
    CHECK ((status = 'CONFIRMED') = (confirmed_at IS NOT NULL))
);
CREATE TABLE showtime_seats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    showtime_id uuid NOT NULL,
    hall_id uuid NOT NULL,
    seat_id uuid NOT NULL,
    state text NOT NULL DEFAULT 'AVAILABLE' CHECK (state IN ('AVAILABLE', 'HELD', 'BOOKED')),
    booking_id uuid,
    hold_expires_at timestamptz,
    FOREIGN KEY (showtime_id, hall_id) REFERENCES showtimes(id, hall_id),
    FOREIGN KEY (seat_id, hall_id) REFERENCES seats(id, hall_id),
    FOREIGN KEY (booking_id, showtime_id) REFERENCES bookings(id, showtime_id),
    UNIQUE (showtime_id, seat_id),
    CHECK (
        (state = 'AVAILABLE' AND booking_id IS NULL AND hold_expires_at IS NULL) OR
        (state = 'HELD' AND booking_id IS NOT NULL AND hold_expires_at IS NOT NULL) OR
        (state = 'BOOKED' AND booking_id IS NOT NULL AND hold_expires_at IS NULL)
    )
);
CREATE TABLE booking_seats (
    booking_id uuid NOT NULL,
    showtime_id uuid NOT NULL,
    seat_id uuid NOT NULL,
    unit_price numeric(14,2) NOT NULL CHECK (unit_price > 0),
    PRIMARY KEY (booking_id, seat_id),
    UNIQUE (booking_id, showtime_id, seat_id),
    FOREIGN KEY (booking_id, showtime_id) REFERENCES bookings(id, showtime_id),
    FOREIGN KEY (showtime_id, seat_id) REFERENCES showtime_seats(showtime_id, seat_id)
);
ALTER TABLE showtime_seats ADD CONSTRAINT showtime_seats_booking_selection
    FOREIGN KEY (booking_id, showtime_id, seat_id)
    REFERENCES booking_seats(booking_id, showtime_id, seat_id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE payment_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES bookings(id),
    provider text NOT NULL CHECK (provider IN ('SEPAY', 'PAYPAL', 'FAKE')),
    provider_environment text NOT NULL CHECK (provider_environment IN ('TEST', 'SANDBOX', 'LIVE')),
    payment_method text NOT NULL CHECK (payment_method IN ('BANK_TRANSFER', 'CARD', 'FAKE')),
    provider_order_reference text,
    provider_reference text,
    idempotency_key uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    amount numeric(14,2) NOT NULL CHECK (amount > 0),
    currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    provider_amount numeric(14,2) NOT NULL CHECK (provider_amount > 0),
    provider_currency text NOT NULL CHECK (provider_currency IN ('VND', 'USD')),
    exchange_rate numeric(24,12) NOT NULL CHECK (exchange_rate > 0),
    exchange_rate_source text,
    exchange_rate_quoted_at timestamptz,
    status text NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'PENDING', 'UNKNOWN', 'SUCCESS', 'FAILED', 'CANCELLED')),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_environment, provider_order_reference),
    UNIQUE (provider, provider_environment, provider_reference),
    CHECK (provider_amount = round(amount * exchange_rate, 2)),
    CHECK ((provider_currency = currency AND exchange_rate = 1) OR
        (provider_currency <> currency AND exchange_rate_source IS NOT NULL
         AND btrim(exchange_rate_source) <> '' AND exchange_rate_quoted_at IS NOT NULL)),
    CHECK ((provider = 'SEPAY' AND payment_method = 'BANK_TRANSFER' AND provider_environment IN ('TEST','LIVE') AND currency = 'VND' AND provider_currency = 'VND') OR
        (provider = 'PAYPAL' AND payment_method = 'CARD' AND provider_environment = 'SANDBOX' AND currency = 'VND' AND provider_currency = 'USD') OR
        (provider = 'FAKE' AND payment_method = 'FAKE' AND provider_environment = 'TEST' AND provider_currency = currency)),
    CHECK (NOT is_active OR status IN ('CREATED', 'PENDING', 'UNKNOWN'))
);
CREATE UNIQUE INDEX payment_attempts_one_active ON payment_attempts(booking_id) WHERE is_active;
CREATE TABLE payment_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_attempt_id uuid NOT NULL REFERENCES payment_attempts(id),
    provider_event_id text,
    event_type text NOT NULL CHECK (event_type IN ('CALLBACK', 'STATUS_QUERY', 'RECONCILIATION')),
    reported_status text NOT NULL CHECK (reported_status IN ('SUCCESS', 'FAILED', 'CANCELLED', 'UNKNOWN', 'PENDING')),
    verification_status text NOT NULL CHECK (verification_status IN ('VERIFIED', 'REJECTED')),
    reported_reference text,
    reported_amount numeric(14,2),
    reported_currency text,
    verification_reason text,
    received_at timestamptz NOT NULL DEFAULT now(),
    processed_at timestamptz,
    UNIQUE (payment_attempt_id, provider_event_id)
);
CREATE TABLE payment_reversals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_attempt_id uuid NOT NULL REFERENCES payment_attempts(id),
    operation_type text NOT NULL CHECK (operation_type IN ('REFUND', 'CANCEL')),
    reason text NOT NULL CHECK (btrim(reason) <> ''),
    amount numeric(14,2) NOT NULL CHECK (amount > 0),
    currency text NOT NULL CHECK (currency IN ('VND', 'USD')),
    status text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'PENDING', 'SUCCESS', 'FAILED', 'UNKNOWN')),
    provider_reference text,
    idempotency_key uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (payment_attempt_id, operation_type)
);

CREATE TABLE tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id),
    qr_token_hash text NOT NULL UNIQUE CHECK (btrim(qr_token_hash) <> ''),
    qr_token_ciphertext bytea NOT NULL CHECK (octet_length(qr_token_ciphertext) > 0),
    qr_key_version text NOT NULL CHECK (btrim(qr_key_version) <> ''),
    customer_name_snapshot text NOT NULL,
    ticket_details_snapshot jsonb NOT NULL CHECK (
        jsonb_typeof(ticket_details_snapshot) = 'object' AND
        ticket_details_snapshot ?& ARRAY['movie', 'cinema', 'showtime', 'seats', 'booking_id', 'price', 'currency']
    ),
    admitted_count integer NOT NULL DEFAULT 0 CHECK (admitted_count BETWEEN 0 AND 10),
    issued_at timestamptz NOT NULL DEFAULT now(),
    used_at timestamptz,
    used_by uuid REFERENCES users(id),
    CHECK ((used_at IS NULL) = (used_by IS NULL))
);
CREATE TABLE ticket_validation_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES tickets(id),
    staff_id uuid NOT NULL REFERENCES users(id),
    expected_showtime_id uuid NOT NULL REFERENCES showtimes(id),
    request_id uuid NOT NULL UNIQUE,
    qr_token_hash text NOT NULL,
    requested_count integer,
    admitted_count integer NOT NULL DEFAULT 0 CHECK (admitted_count BETWEEN 0 AND 10),
    result text NOT NULL CHECK (result IN ('ACCEPTED', 'INVALID_QR', 'FULLY_USED', 'WRONG_SHOWTIME', 'INVALID_COUNT', 'EXCEEDS_REMAINING', 'INVALID_SHOWTIME', 'CHECK_IN_TOO_EARLY', 'CHECK_IN_TOO_LATE')),
    scanned_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((result = 'ACCEPTED' AND ticket_id IS NOT NULL AND requested_count IS NOT NULL AND requested_count > 0 AND admitted_count = requested_count)
        OR (result <> 'ACCEPTED' AND admitted_count = 0))
);

CREATE FUNCTION assert_login_identity() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
DECLARE user_key uuid;
BEGIN
    IF TG_TABLE_NAME = 'user_identities' THEN
        IF TG_OP = 'UPDATE' AND (NEW.user_id, NEW.provider, NEW.provider_subject)
           IS DISTINCT FROM (OLD.user_id, OLD.provider, OLD.provider_subject) THEN
            RAISE EXCEPTION 'Provider identity cannot be moved or silently replaced';
        END IF;
    END IF;
    IF TG_TABLE_NAME = 'users' THEN user_key := NEW.id;
    ELSIF TG_OP = 'DELETE' THEN user_key := OLD.user_id;
    ELSE user_key := NEW.user_id; END IF;
    IF EXISTS (SELECT 1 FROM users u WHERE u.id = user_key AND u.status = 'ACTIVE'
        AND u.password_hash IS NULL AND NOT EXISTS (SELECT 1 FROM user_identities i WHERE i.user_id = u.id)) THEN
        RAISE EXCEPTION 'Active account requires a password hash or linked provider identity';
    END IF;
    RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER users_login_identity AFTER INSERT OR UPDATE ON users DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_login_identity();
CREATE CONSTRAINT TRIGGER providers_login_identity AFTER INSERT OR UPDATE OR DELETE ON user_identities DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_login_identity();

-- Common timestamps; business timeouts are processed by the backend worker.
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['users','movies','showtimes','bookings','payment_attempts','payment_reversals'] LOOP
        EXECUTE format('CREATE TRIGGER touch_updated_at BEFORE UPDATE ON movie_app.%I FOR EACH ROW EXECUTE FUNCTION movie_app.touch_updated_at()', t);
    END LOOP;
END;
$$;

CREATE FUNCTION guard_hall_layout() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
BEGIN
    IF OLD.layout_locked_at IS NOT NULL AND
       (TG_OP = 'DELETE' OR NEW.seat_layout_id IS DISTINCT FROM OLD.seat_layout_id OR
        NEW.cinema_id IS DISTINCT FROM OLD.cinema_id OR NEW.layout_locked_at IS DISTINCT FROM OLD.layout_locked_at) THEN
        RAISE EXCEPTION 'Hall layout and cinema are immutable after first Showtime';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER guard_hall_layout BEFORE UPDATE OR DELETE ON halls
    FOR EACH ROW EXECUTE FUNCTION guard_hall_layout();

CREATE FUNCTION guard_layout_positions() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
DECLARE layout_id uuid;
BEGIN
    IF TG_OP <> 'INSERT' THEN layout_id := OLD.seat_layout_id; ELSE layout_id := NEW.seat_layout_id; END IF;
    PERFORM 1 FROM seat_layouts WHERE id = layout_id FOR UPDATE;
    IF EXISTS (SELECT 1 FROM halls WHERE seat_layout_id = layout_id AND layout_locked_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Seat Layout positions are immutable after use by a Showtime';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.seat_layout_id <> OLD.seat_layout_id THEN
        RAISE EXCEPTION 'Create a new position rather than move it between Seat Layouts';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER guard_layout_positions BEFORE INSERT OR UPDATE OR DELETE ON seat_layout_positions
    FOR EACH ROW EXECUTE FUNCTION guard_layout_positions();

CREATE FUNCTION guard_physical_seats() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
DECLARE hall_key uuid;
BEGIN
    IF TG_OP = 'INSERT' THEN hall_key := NEW.hall_id; ELSE hall_key := OLD.hall_id; END IF;
    PERFORM 1 FROM halls WHERE id = hall_key FOR UPDATE;
    IF EXISTS (SELECT 1 FROM halls WHERE id = hall_key AND layout_locked_at IS NOT NULL) THEN
        RAISE EXCEPTION 'Physical seats are immutable after first Showtime';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.hall_id <> OLD.hall_id THEN
        RAISE EXCEPTION 'Create a new seat rather than move it between Halls';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER guard_physical_seats BEFORE INSERT OR UPDATE OR DELETE ON seats
    FOR EACH ROW EXECUTE FUNCTION guard_physical_seats();

CREATE FUNCTION prepare_showtime() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
DECLARE film movies%ROWTYPE; room halls%ROWTYPE;
BEGIN
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status = 'REMOVED') THEN
        IF EXISTS (SELECT 1 FROM bookings WHERE showtime_id = OLD.id AND status = 'CONFIRMED') THEN
            RAISE EXCEPTION 'Cannot remove a Showtime with confirmed Bookings';
        END IF;
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    END IF;
    SELECT * INTO STRICT film FROM movies WHERE id = NEW.movie_id FOR UPDATE;
    IF NEW.status <> 'REMOVED' AND film.status = 'ARCHIVED' AND
       (TG_OP = 'INSERT' OR NEW.movie_id IS DISTINCT FROM OLD.movie_id OR OLD.status = 'REMOVED') THEN
        RAISE EXCEPTION 'Archived Movie cannot receive a new Showtime';
    END IF;
    SELECT * INTO STRICT room FROM halls WHERE id = NEW.hall_id FOR UPDATE;
    PERFORM 1 FROM seat_layouts WHERE id = room.seat_layout_id FOR UPDATE;
    IF TG_OP = 'INSERT' OR NEW.movie_id IS DISTINCT FROM OLD.movie_id OR NEW.starts_at IS DISTINCT FROM OLD.starts_at THEN
        NEW.ends_at := NEW.starts_at + make_interval(mins => film.duration_minutes);
    END IF;
    NEW.buffer_ends_at := NEW.ends_at + interval '15 minutes';
    IF TG_OP = 'UPDATE' AND (NEW.movie_id, NEW.hall_id, NEW.starts_at, NEW.ends_at, NEW.base_price, NEW.currency)
       IS DISTINCT FROM (OLD.movie_id, OLD.hall_id, OLD.starts_at, OLD.ends_at, OLD.base_price, OLD.currency)
       AND EXISTS (SELECT 1 FROM bookings WHERE showtime_id = OLD.id AND status IN ('HELD','CONFIRMED')) THEN
        RAISE EXCEPTION 'Showtime changes must preserve active holds and confirmed Bookings';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM seats WHERE hall_id = NEW.hall_id) OR
       (SELECT count(*) FROM seats WHERE hall_id = NEW.hall_id) <>
       (SELECT count(*) FROM seat_layout_positions WHERE seat_layout_id = room.seat_layout_id) THEN
        RAISE EXCEPTION 'Hall must contain every seat from its assigned layout';
    END IF;
    UPDATE halls SET layout_locked_at = coalesce(layout_locked_at, now()) WHERE id = NEW.hall_id;
    RETURN NEW;
END;
$$;
CREATE TRIGGER prepare_showtime BEFORE INSERT OR UPDATE OR DELETE ON showtimes
    FOR EACH ROW EXECUTE FUNCTION prepare_showtime();

CREATE FUNCTION guard_movie_changes() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
BEGIN
    IF NEW.status = 'ARCHIVED' AND EXISTS (
        SELECT 1 FROM showtimes WHERE movie_id = NEW.id AND starts_at > now() AND status <> 'REMOVED'
    ) THEN RAISE EXCEPTION 'Cannot archive a Movie with future Showtimes'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER guard_movie_changes BEFORE UPDATE ON movies FOR EACH ROW EXECUTE FUNCTION guard_movie_changes();
CREATE FUNCTION refresh_future_duration() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
BEGIN
    IF NEW.duration_minutes <> OLD.duration_minutes THEN
        UPDATE showtimes SET ends_at = starts_at + make_interval(mins => NEW.duration_minutes)
        WHERE movie_id = NEW.id AND starts_at > now() AND status <> 'REMOVED';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER refresh_future_duration AFTER UPDATE ON movies FOR EACH ROW EXECUTE FUNCTION refresh_future_duration();

CREATE FUNCTION guard_booking_changes() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND (NEW.customer_id, NEW.showtime_id, NEW.seat_count, NEW.total_amount, NEW.currency, NEW.hold_started_at, NEW.hold_expires_at)
       IS DISTINCT FROM (OLD.customer_id, OLD.showtime_id, OLD.seat_count, OLD.total_amount, OLD.currency, OLD.hold_started_at, OLD.hold_expires_at) THEN
        RAISE EXCEPTION 'Booking identity, selected-seat count, price and original hold are immutable';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.status = 'CONFIRMED' AND NEW.status <> 'CONFIRMED' THEN
        RAISE EXCEPTION 'Confirmed Booking cannot be cancelled';
    END IF;
    IF TG_OP = 'INSERT' THEN
        PERFORM 1 FROM users WHERE id = NEW.customer_id AND role = 'CUSTOMER' AND status = 'ACTIVE' AND email_verified_at IS NOT NULL FOR SHARE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Booking requires an active verified Customer'; END IF;
    END IF;
    PERFORM 1 FROM showtimes WHERE id = NEW.showtime_id FOR UPDATE;
    IF TG_OP = 'INSERT' AND NOT EXISTS (
        SELECT 1 FROM showtimes WHERE id = NEW.showtime_id AND status = 'PUBLISHED' AND starts_at > now()
    ) THEN RAISE EXCEPTION 'Booking requires a published future Showtime'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER guard_booking_changes BEFORE INSERT OR UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION guard_booking_changes();

CREATE FUNCTION validate_seat_price() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
DECLARE b bookings%ROWTYPE; s showtimes%ROWTYPE;
BEGIN
    SELECT * INTO STRICT b FROM bookings WHERE id = NEW.booking_id FOR UPDATE;
    SELECT * INTO STRICT s FROM showtimes WHERE id = b.showtime_id FOR UPDATE;
    IF b.status <> 'HELD' OR NEW.unit_price <> s.base_price OR b.currency <> s.currency THEN
        RAISE EXCEPTION 'Seat selection requires an active hold and the Showtime base price/currency';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_seat_price BEFORE INSERT ON booking_seats FOR EACH ROW EXECUTE FUNCTION validate_seat_price();

CREATE FUNCTION forbid_history_change() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
BEGIN RAISE EXCEPTION 'Historical selections and check-in logs are immutable'; END;
$$;
CREATE TRIGGER booking_seats_history BEFORE UPDATE OR DELETE ON booking_seats FOR EACH ROW EXECUTE FUNCTION forbid_history_change();
CREATE TRIGGER validation_logs_history BEFORE UPDATE OR DELETE ON ticket_validation_logs FOR EACH ROW EXECUTE FUNCTION forbid_history_change();
CREATE TRIGGER ticket_history BEFORE DELETE ON tickets FOR EACH ROW EXECUTE FUNCTION forbid_history_change();
CREATE TRIGGER seat_inventory_history BEFORE DELETE ON showtime_seats FOR EACH ROW EXECUTE FUNCTION forbid_history_change();

CREATE FUNCTION guard_payment_values() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
DECLARE b bookings%ROWTYPE;
BEGIN
    SELECT * INTO STRICT b FROM bookings WHERE id = NEW.booking_id FOR UPDATE;
    IF NEW.amount <> b.total_amount OR NEW.currency <> b.currency THEN
        RAISE EXCEPTION 'Payment amount and currency must match Booking';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW.booking_id, NEW.provider, NEW.provider_environment, NEW.payment_method,
        NEW.idempotency_key, NEW.amount, NEW.currency, NEW.provider_amount, NEW.provider_currency,
        NEW.exchange_rate, NEW.exchange_rate_source, NEW.exchange_rate_quoted_at)
       IS DISTINCT FROM (OLD.booking_id, OLD.provider, OLD.provider_environment, OLD.payment_method,
        OLD.idempotency_key, OLD.amount, OLD.currency, OLD.provider_amount, OLD.provider_currency,
        OLD.exchange_rate, OLD.exchange_rate_source, OLD.exchange_rate_quoted_at) THEN
        RAISE EXCEPTION 'Payment attempt identity and expected values are immutable';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.status = 'SUCCESS' AND NEW.status <> 'SUCCESS' THEN
        RAISE EXCEPTION 'Captured payment remains SUCCESS; track reversal separately';
    END IF;
    IF (TG_OP = 'INSERT' OR (NEW.is_active AND NOT OLD.is_active)) AND (b.status <> 'HELD' OR b.hold_expires_at <= now()) THEN
        RAISE EXCEPTION 'Create or retry payment only within the original active hold';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER guard_payment_values BEFORE INSERT OR UPDATE ON payment_attempts FOR EACH ROW EXECUTE FUNCTION guard_payment_values();

CREATE FUNCTION guard_reversal_values() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
DECLARE p payment_attempts%ROWTYPE;
BEGIN
    SELECT * INTO STRICT p FROM payment_attempts WHERE id = NEW.payment_attempt_id FOR UPDATE;
    IF NEW.amount > p.provider_amount OR NEW.currency <> p.provider_currency OR (NEW.operation_type = 'REFUND' AND p.status <> 'SUCCESS') THEN
        RAISE EXCEPTION 'Refund requires captured payment and cannot exceed original amount';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW.payment_attempt_id, NEW.operation_type, NEW.amount, NEW.currency, NEW.idempotency_key)
       IS DISTINCT FROM (OLD.payment_attempt_id, OLD.operation_type, OLD.amount, OLD.currency, OLD.idempotency_key) THEN
        RAISE EXCEPTION 'Retry a reversal using its original identity and idempotency key';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER guard_reversal_values BEFORE INSERT OR UPDATE ON payment_reversals FOR EACH ROW EXECUTE FUNCTION guard_reversal_values();

-- Deferred checks allow Booking, seat state, verified payment and Ticket to commit together.
CREATE FUNCTION assert_booking_consistency() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
DECLARE booking_key uuid; b bookings%ROWTYPE; actual_count integer; actual_total numeric; owned_count integer;
BEGIN
    IF TG_TABLE_NAME = 'bookings' THEN booking_key := NEW.id;
    ELSIF TG_TABLE_NAME = 'payment_events' THEN SELECT booking_id INTO booking_key FROM payment_attempts WHERE id = NEW.payment_attempt_id;
    ELSE booking_key := NEW.booking_id; END IF;
    SELECT * INTO b FROM bookings WHERE id = booking_key FOR UPDATE;
    IF NOT FOUND THEN RETURN NULL; END IF;
    SELECT count(*), coalesce(sum(unit_price), 0) INTO actual_count, actual_total FROM booking_seats WHERE booking_id = b.id;
    IF actual_count <> b.seat_count OR actual_total <> b.total_amount THEN
        RAISE EXCEPTION 'Booking must have 1-10 selected seats and matching price total';
    END IF;
    IF b.status = 'HELD' THEN
        SELECT count(*) INTO owned_count FROM showtime_seats WHERE booking_id = b.id AND state = 'HELD' AND hold_expires_at = b.hold_expires_at;
        IF owned_count <> b.seat_count THEN RAISE EXCEPTION 'Active Booking must own all selected seats under its original hold'; END IF;
    ELSIF b.status = 'CONFIRMED' THEN
        SELECT count(*) INTO owned_count FROM showtime_seats WHERE booking_id = b.id AND state = 'BOOKED';
        IF owned_count <> b.seat_count OR NOT EXISTS (SELECT 1 FROM tickets WHERE booking_id = b.id) OR NOT EXISTS (
            SELECT 1 FROM payment_attempts p JOIN payment_events e ON e.payment_attempt_id = p.id
            WHERE p.booking_id = b.id AND p.status = 'SUCCESS' AND e.reported_status = 'SUCCESS'
              AND e.verification_status = 'VERIFIED' AND p.amount = b.total_amount AND p.currency = b.currency
              AND e.reported_amount = p.provider_amount AND e.reported_currency = p.provider_currency AND e.reported_reference = p.provider_reference
        ) THEN RAISE EXCEPTION 'Confirmation requires booked seats, verified successful payment and one Ticket'; END IF;
    ELSIF EXISTS (SELECT 1 FROM showtime_seats WHERE booking_id = b.id) THEN
        RAISE EXCEPTION 'Ended unconfirmed Booking must release its seats';
    END IF;
    RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER bookings_consistent AFTER INSERT OR UPDATE ON bookings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_booking_consistency();
CREATE CONSTRAINT TRIGGER booking_seats_consistent AFTER INSERT ON booking_seats DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_booking_consistency();
CREATE CONSTRAINT TRIGGER payment_booking_consistent AFTER INSERT OR UPDATE ON payment_attempts DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_booking_consistency();
CREATE CONSTRAINT TRIGGER event_booking_consistent AFTER INSERT OR UPDATE ON payment_events DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_booking_consistency();
CREATE CONSTRAINT TRIGGER ticket_booking_consistent AFTER INSERT OR UPDATE ON tickets DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_booking_consistency();
CREATE TRIGGER payment_events_history BEFORE DELETE ON payment_events FOR EACH ROW EXECUTE FUNCTION forbid_history_change();

CREATE FUNCTION assert_seat_consistency() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
DECLARE s showtime_seats%ROWTYPE; b bookings%ROWTYPE;
BEGIN
    SELECT * INTO s FROM showtime_seats WHERE id = NEW.id;
    IF s.booking_id IS NOT NULL THEN
        SELECT * INTO STRICT b FROM bookings WHERE id = s.booking_id;
        IF (s.state = 'HELD' AND (b.status <> 'HELD' OR s.hold_expires_at <> b.hold_expires_at)) OR
           (s.state = 'BOOKED' AND b.status <> 'CONFIRMED') THEN
            RAISE EXCEPTION 'Seat ownership must match Booking state and original hold';
        END IF;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.state = 'BOOKED' AND (NEW.state <> 'BOOKED' OR NEW.booking_id IS DISTINCT FROM OLD.booking_id) THEN
        RAISE EXCEPTION 'Booked seats cannot be released or transferred';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.booking_id IS DISTINCT FROM NEW.booking_id AND OLD.booking_id IS NOT NULL AND
       EXISTS (SELECT 1 FROM bookings WHERE id = OLD.booking_id AND status = 'HELD') THEN
        RAISE EXCEPTION 'Release or transfer requires ending the previous hold in the same transaction';
    END IF;
    RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER seats_consistent AFTER INSERT OR UPDATE ON showtime_seats DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_seat_consistency();

CREATE FUNCTION guard_ticket() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
DECLARE b bookings%ROWTYPE;
BEGIN
    SELECT * INTO STRICT b FROM bookings WHERE id = NEW.booking_id FOR UPDATE;
    IF b.status <> 'CONFIRMED' OR NEW.admitted_count > b.seat_count THEN RAISE EXCEPTION 'Ticket requires confirmed Booking and valid admission count'; END IF;
    IF TG_OP = 'INSERT' AND NEW.admitted_count <> 0 THEN RAISE EXCEPTION 'New Ticket starts with zero admissions'; END IF;
    IF TG_OP = 'UPDATE' AND (NEW.booking_id, NEW.qr_token_hash, NEW.customer_name_snapshot, NEW.ticket_details_snapshot, NEW.issued_at)
       IS DISTINCT FROM (OLD.booking_id, OLD.qr_token_hash, OLD.customer_name_snapshot, OLD.ticket_details_snapshot, OLD.issued_at) THEN
        RAISE EXCEPTION 'Issued Ticket identity and purchase snapshot are immutable';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.admitted_count < OLD.admitted_count THEN RAISE EXCEPTION 'Admissions cannot be decreased'; END IF;
    IF (NEW.admitted_count = b.seat_count) <> (NEW.used_at IS NOT NULL) THEN RAISE EXCEPTION 'Ticket is used only when all admissions are consumed'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER guard_ticket BEFORE INSERT OR UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION guard_ticket();

CREATE FUNCTION validate_check_in_log() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.staff_id AND role = 'CINEMA_STAFF' AND status = 'ACTIVE') THEN
        RAISE EXCEPTION 'Check-in audit requires active Cinema Staff';
    END IF;
    IF NEW.result = 'ACCEPTED' AND NOT EXISTS (
        SELECT 1 FROM tickets t JOIN bookings b ON b.id = t.booking_id
        WHERE t.id = NEW.ticket_id AND t.qr_token_hash = NEW.qr_token_hash
          AND b.status = 'CONFIRMED' AND b.showtime_id = NEW.expected_showtime_id
    ) THEN RAISE EXCEPTION 'Accepted check-in must match Ticket and confirmed Showtime'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER validate_check_in_log BEFORE INSERT ON ticket_validation_logs FOR EACH ROW EXECUTE FUNCTION validate_check_in_log();

CREATE FUNCTION assert_admission_audit() RETURNS trigger LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
DECLARE ticket_key uuid; admitted integer; logged integer;
BEGIN
    IF TG_TABLE_NAME = 'tickets' THEN ticket_key := NEW.id; ELSE ticket_key := NEW.ticket_id; END IF;
    IF ticket_key IS NULL THEN RETURN NULL; END IF;
    SELECT admitted_count INTO admitted FROM tickets WHERE id = ticket_key;
    SELECT coalesce(sum(admitted_count), 0) INTO logged FROM ticket_validation_logs WHERE ticket_id = ticket_key AND result = 'ACCEPTED';
    IF admitted <> logged THEN RAISE EXCEPTION 'Ticket admission count must equal accepted check-in audit total'; END IF;
    RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER ticket_admission_audit AFTER INSERT OR UPDATE ON tickets DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_admission_audit();
CREATE CONSTRAINT TRIGGER log_admission_audit AFTER INSERT ON ticket_validation_logs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION assert_admission_audit();

-- Called only by authenticated Spring Boot staff workflow after hashing the presented QR.
-- A scan previews a Ticket; only explicit admission confirmation calls this function.
CREATE FUNCTION check_in_ticket(p_request_id uuid, p_qr_hash text, p_staff_id uuid,
    p_showtime_id uuid, p_count integer) RETURNS ticket_validation_logs LANGUAGE plpgsql
SET search_path = movie_app, pg_temp AS $$
DECLARE previous ticket_validation_logs%ROWTYPE; t tickets%ROWTYPE; b bookings%ROWTYPE;
    result_row ticket_validation_logs%ROWTYPE; outcome text; remaining integer;
    screening showtimes%ROWTYPE; venue cinemas%ROWTYPE; check_time timestamptz;
BEGIN
    IF p_request_id IS NULL OR p_qr_hash IS NULL THEN RAISE EXCEPTION 'Request ID and QR hash are required'; END IF;
    PERFORM 1 FROM users WHERE id = p_staff_id AND role = 'CINEMA_STAFF' AND status = 'ACTIVE';
    IF NOT FOUND THEN RAISE EXCEPTION 'Active Cinema Staff is required'; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
    SELECT * INTO previous FROM ticket_validation_logs WHERE request_id = p_request_id;
    IF FOUND THEN
        IF (previous.qr_token_hash, previous.staff_id, previous.expected_showtime_id, previous.requested_count)
           IS DISTINCT FROM (p_qr_hash, p_staff_id, p_showtime_id, p_count) THEN
            RAISE EXCEPTION 'Request ID cannot be reused with different data';
        END IF;
        RETURN previous;
    END IF;
    SELECT * INTO t FROM tickets WHERE qr_token_hash = p_qr_hash FOR UPDATE;
    IF NOT FOUND THEN outcome := 'INVALID_QR';
    ELSE
        SELECT * INTO STRICT b FROM bookings WHERE id = t.booking_id;
        SELECT * INTO STRICT screening FROM showtimes WHERE id = b.showtime_id FOR SHARE;
        SELECT c.* INTO STRICT venue FROM cinemas c JOIN halls h ON h.cinema_id = c.id
            WHERE h.id = screening.hall_id FOR SHARE OF c;
        check_time := clock_timestamp();
        remaining := b.seat_count - t.admitted_count;
        IF b.showtime_id <> p_showtime_id THEN outcome := 'WRONG_SHOWTIME';
        ELSIF NOT EXISTS (SELECT 1 FROM showtimes WHERE id = p_showtime_id AND status = 'PUBLISHED') THEN outcome := 'INVALID_SHOWTIME';
        ELSIF remaining = 0 THEN outcome := 'FULLY_USED';
        ELSIF check_time < screening.starts_at - make_interval(mins => venue.check_in_opens_before_minutes) THEN outcome := 'CHECK_IN_TOO_EARLY';
        ELSIF check_time > screening.starts_at + make_interval(mins => venue.check_in_closes_after_minutes) THEN outcome := 'CHECK_IN_TOO_LATE';
        ELSIF p_count IS NULL OR p_count <= 0 THEN outcome := 'INVALID_COUNT';
        ELSIF p_count > remaining THEN outcome := 'EXCEEDS_REMAINING';
        ELSE
            outcome := 'ACCEPTED';
            UPDATE tickets SET admitted_count = admitted_count + p_count,
                used_at = CASE WHEN p_count = remaining THEN check_time ELSE NULL END,
                used_by = CASE WHEN p_count = remaining THEN p_staff_id ELSE NULL END
            WHERE id = t.id;
        END IF;
    END IF;
    INSERT INTO ticket_validation_logs(ticket_id, staff_id, expected_showtime_id, request_id,
        qr_token_hash, requested_count, admitted_count, result, scanned_at)
    VALUES (t.id, p_staff_id, p_showtime_id, p_request_id, p_qr_hash, p_count,
        CASE WHEN outcome = 'ACCEPTED' THEN p_count ELSE 0 END, outcome, coalesce(check_time, clock_timestamp()))
    RETURNING * INTO result_row;
    RETURN result_row;
END;
$$;

CREATE INDEX cinemas_location ON cinemas(location_id);
CREATE INDEX halls_layout ON halls(seat_layout_id);
CREATE INDEX showtimes_movie_start ON showtimes(movie_id, starts_at) WHERE status <> 'REMOVED';
CREATE INDEX bookings_customer_history ON bookings(customer_id, created_at DESC);
CREATE INDEX bookings_showtime ON bookings(showtime_id);
CREATE INDEX bookings_expiry ON bookings(hold_expires_at) WHERE status = 'HELD';
CREATE INDEX showtime_seats_owner ON showtime_seats(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX showtime_seats_expiry ON showtime_seats(hold_expires_at) WHERE state = 'HELD';
CREATE INDEX payment_attempts_booking ON payment_attempts(booking_id, created_at DESC);
CREATE INDEX payment_events_attempt ON payment_events(payment_attempt_id, received_at);
CREATE INDEX validation_logs_ticket ON ticket_validation_logs(ticket_id, scanned_at);
CREATE INDEX reset_tokens_user ON password_reset_tokens(user_id);

-- Non-exposed schema, no Supabase browser grants or RPC access.
-- Backend connects through JDBC using the migration owner or a separately provisioned
-- trusted database role with table privileges + backend_only policies (see README).
REVOKE ALL ON SCHEMA movie_app FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA movie_app FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA movie_app FROM PUBLIC;
DO $$
DECLARE role_name text; table_name text;
BEGIN
    FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('REVOKE ALL ON SCHEMA movie_app FROM %I', role_name);
            EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA movie_app FROM %I', role_name);
            EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA movie_app FROM %I', role_name);
        END IF;
    END LOOP;
    FOR table_name IN SELECT tablename FROM pg_tables WHERE schemaname = 'movie_app' LOOP
        EXECUTE format('ALTER TABLE movie_app.%I ENABLE ROW LEVEL SECURITY', table_name);
    END LOOP;
END;
$$;
ALTER DEFAULT PRIVILEGES IN SCHEMA movie_app REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

COMMIT;
