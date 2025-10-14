-- Example Supabase table for saved games
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  moves jsonb
);
