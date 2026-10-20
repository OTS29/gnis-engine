-- GNIS v19. Run this once in the Neon SQL Editor BEFORE you push v19.

-- Invoices and receipts
alter table sites add column if not exists invoice_seq int not null default 0;
alter table site_bookings add column if not exists invoice_no int;
alter table site_bookings add column if not exists invoice_issued_at timestamptz;
alter table site_bookings add column if not exists paid_at timestamptz;
alter table site_bookings add column if not exists paid_method text;

-- Changing your web address (the old address keeps working and forwards to the new one)
alter table sites add column if not exists slug_changed_at timestamptz;
create table if not exists site_slug_redirects (
  old_slug text primary key,
  site_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists site_slug_redirects_site on site_slug_redirects (site_id);

-- Signing people out everywhere after a password reset or deactivation
alter table users add column if not exists sessions_valid_after timestamptz;

-- Hide ID numbers already stored: keep only the last 4 characters
update users set identity_node_number = '****' || right(identity_node_number, 4)
where identity_node_number is not null and identity_node_number not like '****%';
