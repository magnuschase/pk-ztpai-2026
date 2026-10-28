-- Bazowa rezerwacja: sala 1, 10:00-12:00
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time)
VALUES (1, 'EXCL baza', 10, '2027-01-15T10:00:00Z', '2027-01-15T12:00:00Z');

-- 1. Nakładająca się CONFIRMED w tej samej sali -> 23P01 reservations_no_overlap
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time)
VALUES (1, 'EXCL kolizja', 10, '2027-01-15T11:00:00Z', '2027-01-15T11:30:00Z');

-- 2. Styk 12:00-13:00 -> OK ('[)' - koniec przedziału nie należy do niego)
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time)
VALUES (1, 'EXCL styk', 10, '2027-01-15T12:00:00Z', '2027-01-15T13:00:00Z');

-- 3. Ten sam przedział w innej sali -> OK
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time)
VALUES (2, 'EXCL inna sala', 10, '2027-01-15T10:00:00Z', '2027-01-15T12:00:00Z');

-- 4. Anulowana w tym samym przedziale -> OK (WHERE status = 'CONFIRMED')
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time, status, cancelled_at)
VALUES (1, 'EXCL anulowana', 10, '2027-01-15T10:00:00Z', '2027-01-15T12:00:00Z', 'CANCELLED', now());

-- 5. Po anulowaniu bazowej termin się zwalnia -> nowa CONFIRMED OK
UPDATE reservations SET status = 'CANCELLED', cancelled_at = now() WHERE reserved_by = 'EXCL baza';
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time)
VALUES (1, 'EXCL po anulowaniu', 10, '2027-01-15T10:00:00Z', '2027-01-15T12:00:00Z');

-- 6. Przywrócenie anulowanej (CANCELLED -> CONFIRMED) przy zajętym terminie -> 23P01
UPDATE reservations SET status = 'CONFIRMED', cancelled_at = NULL WHERE reserved_by = 'EXCL baza';

-- Sprzątanie
DELETE FROM reservations WHERE reserved_by LIKE 'EXCL %';
