create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  subscription jsonb not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx on push_subscriptions(user_id);

create table if not exists artist_release_seen (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  artist_id text not null,
  artist_name text,
  last_release_id text,
  last_release_name text,
  updated_at timestamptz default now(),
  unique(user_id, artist_id)
);

create index if not exists artist_release_seen_user_idx on artist_release_seen(user_id);

create table if not exists listening_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_type text not null,
  track_uri text,
  track_name text,
  track_artist text,
  meta jsonb,
  created_at timestamptz default now()
);

create index if not exists listening_analytics_user_idx on listening_analytics(user_id, created_at desc);
create index if not exists listening_analytics_type_idx on listening_analytics(event_type, created_at desc);
