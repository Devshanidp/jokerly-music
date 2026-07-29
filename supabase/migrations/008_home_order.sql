-- Persist home page section order per user (synced across devices)
alter table user_language_prefs
  add column if not exists home_order jsonb default null;
