-- pnpm db:psql

-- Wiersze tabeli users - w bazie jest tylko hash bcrypt ($2b$12$...: algorytm 2b, cost 12,
-- 22 znaki soli + 31 znaków hasha), hasła nie da się z niego odtworzyć
SELECT id, email, password_hash, role, created_at FROM users ORDER BY id;

-- Constrainty tabeli users
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass
ORDER BY conname;

-- 1. Duplikat emaila -> 23505 users_email_unique
INSERT INTO users (email, password_hash) VALUES ('admin@example.com', 'x');

-- 2. Email z wielkimi literami (ominięcie normalizacji z API) -> 23514 users_email_lowercase_check
INSERT INTO users (email, password_hash) VALUES ('Admin@Example.com', 'x');

-- 3. Nieznana rola -> 23514 users_role_check
INSERT INTO users (email, password_hash, role) VALUES ('root@example.com', 'x', 'ROOT');
