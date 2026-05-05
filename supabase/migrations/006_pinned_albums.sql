create table if not exists pinned_albums (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  album_id text not null,
  album_name text not null,
  album_image text default '',
  artist_name text default '',
  pinned_at timestamptz default now(),
  unique(user_id, album_id)
);

alter table pinned_albums enable row level security;

create policy "Users can manage their own pinned albums"
  on pinned_albums
  for all
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  with check (user_id = current_setting('request.jwt.claims', true)::json->>'sub');