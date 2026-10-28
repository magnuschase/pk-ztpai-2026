-- pnpm db:psql

-- Dane poprawne (punkt odniesienia)
INSERT INTO buildings (name, address) VALUES ('Budynek A', 'ul. Warszawska 24, Kraków');
INSERT INTO buildings (name, address) VALUES ('Budynek B', 'ul. Podchorążych 2, Kraków');
INSERT INTO rooms (building_id, name, capacity) VALUES (1, '101', 30);
INSERT INTO rooms (building_id, name, capacity) VALUES (2, '101', 20);  -- OK: ta sama nazwa, inny budynek
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time)
VALUES (1, 'Jan Kowalski', 20, '2026-11-10T10:00:00Z', '2026-11-10T12:00:00Z');

-- 1. buildings.name UNIQUE -> 23505 buildings_name_unique
INSERT INTO buildings (name, address) VALUES ('Budynek A', 'ul. Inna 1, Kraków');

-- 2. rooms (building_id, name) UNIQUE -> 23505 rooms_building_id_name_unique
INSERT INTO rooms (building_id, name, capacity) VALUES (1, '101', 10);

-- 3. rooms.capacity > 0 -> 23514 rooms_capacity_check
INSERT INTO rooms (building_id, name, capacity) VALUES (1, '102', 0);

-- 4. rooms.building_id FK (nieistniejący budynek) -> 23503 rooms_building_id_foreign
INSERT INTO rooms (building_id, name, capacity) VALUES (999, '101', 10);

-- 5. reservations end_time > start_time -> 23514 reservations_time_range_check
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time)
VALUES (1, 'Jan Kowalski', 5, '2026-11-10T12:00:00Z', '2026-11-10T10:00:00Z');

-- 6. reservations.status dozwolone wartości -> 23514 reservations_status_check
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time, status)
VALUES (1, 'Jan Kowalski', 5, '2026-11-11T10:00:00Z', '2026-11-11T12:00:00Z', 'PENDING');

-- 7. reservations.participants > 0 -> 23514 reservations_participants_check
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time)
VALUES (1, 'Jan Kowalski', 0, '2026-11-11T10:00:00Z', '2026-11-11T12:00:00Z');

-- 8. status CANCELLED bez cancelled_at -> 23514 reservations_cancelled_at_check
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time, status)
VALUES (1, 'Jan Kowalski', 5, '2026-11-11T10:00:00Z', '2026-11-11T12:00:00Z', 'CANCELLED');

-- 9. reservations.room_id FK (nieistniejąca sala) -> 23503 reservations_room_id_foreign
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time)
VALUES (999, 'Jan Kowalski', 5, '2026-11-11T10:00:00Z', '2026-11-11T12:00:00Z');

-- 10. ON DELETE RESTRICT: sala z rezerwacjami -> 23503 reservations_room_id_foreign
DELETE FROM rooms WHERE id = 1;

-- 11. ON DELETE RESTRICT: budynek z salami -> 23503 rooms_building_id_foreign
DELETE FROM buildings WHERE id = 2;

-- Cleanup
TRUNCATE reservations, rooms, buildings RESTART IDENTITY;
