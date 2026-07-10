-- Seed data migrated from src/data/users.json — run after schema.sql.
-- Passwords are bcrypt hashes of the same dev passwords already in use
-- (admin123 / budi123 / sari123) — change them for real once this is live.

insert into app_users (id, name, email, password_hash, role, permissions) values
  ('admin',    'Admin Ega',    'admin@ega.co.id', '$2b$10$/KxcOyft6rYIlsZcCZM.xe6tY.ZTXWfUYV2mzY.e0PMzqe.aMcXH2',
   'admin',    '["transaksi","pembayaran","keyword-mapping","master-data","audit-log"]'),
  ('emp-budi', 'Budi Santoso', 'budi@ega.co.id',  '$2b$10$6.DBtX3dNrsoU/eMA73ovOMWJ01mG/oQDc.U7mur7p/9aa9gnXTiq',
   'employee', '["transaksi"]'),
  ('emp-sari', 'Sari Dewi',    'sari@ega.co.id',  '$2b$10$.ow2Khq7sFme8R.iELYJv.w11ptso9iO7sjEV8ObTmIuLgaX8RWyq',
   'employee', '["transaksi","keyword-mapping","master-data","audit-log"]')
on conflict (id) do nothing;
