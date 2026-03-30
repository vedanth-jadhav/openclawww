create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  username text,
  provider text,
  provider_user_id text,
  bio text,
  website_url text,
  github_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_username_format check (
    username is null or username = lower(btrim(username))
  )
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  description text,
  category text not null,
  access_tier text not null default 'free',
  status text not null default 'draft',
  is_scaffold_only boolean not null default false,
  install_command text,
  readme_markdown text not null default '',
  install_manifest jsonb not null default '{}'::jsonb,
  asset_payload jsonb not null default '{}'::jsonb,
  tags text[] not null default '{}',
  future_capabilities jsonb not null default '[]'::jsonb,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint items_slug_canonical check (
    slug = lower(btrim(slug))
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint items_category_check check (
    category in ('command', 'integration', 'mcp', 'prompt', 'skill', 'template', 'utility', 'workflow')
  ),
  constraint items_access_tier_check check (
    access_tier in ('free', 'paid', 'scaffold')
  ),
  constraint items_status_check check (
    status in ('draft', 'published', 'archived', 'scaffold')
  ),
  constraint items_scaffold_placeholder_check check (
    (is_scaffold_only = true and access_tier = 'scaffold' and status = 'scaffold')
    or is_scaffold_only = false
  ),
  constraint items_install_command_required_for_installable check (
    (is_scaffold_only = false and access_tier = 'free' and status = 'published' and length(coalesce(install_command, '')) > 0)
    or not (is_scaffold_only = false and access_tier = 'free' and status = 'published')
  )
);

create index items_category_idx on public.items(category);
create index items_status_idx on public.items(status);
create index items_access_tier_idx on public.items(access_tier);
create index items_tags_gin_idx on public.items using gin(tags);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  author_profile_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null,
  headline text,
  body text,
  status text not null default 'published',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reviews_rating_check check (rating between 1 and 5),
  constraint reviews_status_check check (status in ('published', 'hidden', 'flagged')),
  constraint reviews_unique_author_per_item unique (item_id, author_profile_id)
);

create index reviews_item_idx on public.reviews(item_id);

create table public.wizard_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  session_status text not null default 'draft',
  prompt_summary text,
  answers jsonb not null default '[]'::jsonb,
  recommended_item_slugs text[] not null default '{}',
  skill_file_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint wizard_sessions_status_check check (
    session_status in ('draft', 'completed', 'cancelled', 'errored')
  )
);

create table public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete cascade,
  slug text unique,
  display_name text not null,
  onboarding_status text not null default 'placeholder',
  is_placeholder boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint seller_profiles_slug_canonical check (
    slug is null or (slug = lower(btrim(slug)) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
  ),
  constraint seller_profiles_status_check check (
    onboarding_status in ('placeholder', 'invited', 'pending', 'active', 'disabled')
  ),
  constraint seller_profiles_placeholder_only check (
    is_placeholder = true and onboarding_status = 'placeholder'
  )
);

create table public.payment_products (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.items(id) on delete cascade,
  seller_profile_id uuid references public.seller_profiles(id) on delete set null,
  provider text,
  external_product_id text,
  external_price_id text,
  status text not null default 'scaffold',
  is_placeholder boolean not null default true,
  billing_interval text,
  amount_cents integer,
  currency_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payment_products_status_check check (
    status in ('scaffold', 'inactive', 'active', 'retired')
  ),
  constraint payment_products_provider_check check (
    provider is null or provider in ('stripe', 'manual', 'placeholder')
  ),
  constraint payment_products_billing_interval_check check (
    billing_interval is null or billing_interval in ('one_time', 'monthly', 'yearly')
  ),
  constraint payment_products_currency_check check (
    currency_code is null or currency_code = lower(currency_code)
  ),
  constraint payment_products_placeholder_only check (
    is_placeholder = true and status = 'scaffold'
  )
);

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.reviews enable row level security;
alter table public.wizard_sessions enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.payment_products enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "items_select_published" on public.items
  for select
  using (status = 'published');

create policy "reviews_select_published" on public.reviews
  for select
  using (status = 'published');

create policy "reviews_insert_own" on public.reviews
  for insert to authenticated
  with check (auth.uid() = author_profile_id);

create policy "reviews_update_own" on public.reviews
  for update to authenticated
  using (auth.uid() = author_profile_id)
  with check (auth.uid() = author_profile_id);

create policy "wizard_sessions_select_own" on public.wizard_sessions
  for select to authenticated
  using (auth.uid() = profile_id);

create policy "wizard_sessions_insert_own" on public.wizard_sessions
  for insert to authenticated
  with check (auth.uid() = profile_id);

create policy "wizard_sessions_update_own" on public.wizard_sessions
  for update to authenticated
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "seller_profiles_select_placeholder" on public.seller_profiles
  for select
  using (true);

create policy "payment_products_select_placeholder" on public.payment_products
  for select
  using (true);

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  app_metadata jsonb := coalesce(new.raw_app_meta_data, '{}'::jsonb);
  derived_username text;
begin
  derived_username := nullif(
    left(
      regexp_replace(
        lower(
          coalesce(
            user_metadata->>'preferred_username',
            user_metadata->>'user_name',
            user_metadata->>'username',
            split_part(coalesce(new.email, ''), '@', 1)
          )
        ),
        '[^a-z0-9]+',
        '-',
        'g'
      ),
      48
    ),
    ''
  );

  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    username,
    provider,
    provider_user_id,
    bio,
    website_url,
    github_url,
    metadata
  )
  values (
    new.id,
    new.email,
    nullif(coalesce(user_metadata->>'full_name', user_metadata->>'name'), ''),
    nullif(user_metadata->>'avatar_url', ''),
    derived_username,
    nullif(coalesce(app_metadata->>'provider', user_metadata->>'provider'), ''),
    nullif(coalesce(user_metadata->>'sub', user_metadata->>'provider_id', app_metadata->>'provider_id'), ''),
    nullif(user_metadata->>'bio', ''),
    nullif(user_metadata->>'website', ''),
    nullif(user_metadata->>'user_name', ''),
    user_metadata
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    username = coalesce(public.profiles.username, excluded.username),
    provider = coalesce(excluded.provider, public.profiles.provider),
    provider_user_id = coalesce(excluded.provider_user_id, public.profiles.provider_user_id),
    bio = coalesce(excluded.bio, public.profiles.bio),
    website_url = coalesce(excluded.website_url, public.profiles.website_url),
    github_url = coalesce(excluded.github_url, public.profiles.github_url),
    metadata = public.profiles.metadata || excluded.metadata,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.sync_profile_from_auth_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data, raw_app_meta_data on auth.users
  for each row execute function public.sync_profile_from_auth_user();

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger handle_items_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

create trigger handle_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

create trigger handle_wizard_sessions_updated_at
  before update on public.wizard_sessions
  for each row execute function public.set_updated_at();

create trigger handle_seller_profiles_updated_at
  before update on public.seller_profiles
  for each row execute function public.set_updated_at();

create trigger handle_payment_products_updated_at
  before update on public.payment_products
  for each row execute function public.set_updated_at();
