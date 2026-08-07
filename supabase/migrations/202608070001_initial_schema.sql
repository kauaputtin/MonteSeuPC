create extension if not exists pgcrypto;

create table public.categories (
  id text primary key default gen_random_uuid()::text,
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order integer not null unique check (sort_order > 0),
  created_at timestamptz not null default now()
);

create table public.components (
  id text primary key default gen_random_uuid()::text,
  category_id text not null references public.categories(id) on delete restrict,
  brand text not null check (char_length(brand) between 2 and 80),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  image_url text not null,
  specifications jsonb not null check (jsonb_typeof(specifications) = 'object' and specifications ? 'kind'),
  estimated_watts numeric(8,2) not null default 0 check (estimated_watts >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id text primary key default gen_random_uuid()::text,
  name text not null check (char_length(name) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url text,
  website_url text not null check (website_url ~ '^https?://'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offers (
  id text primary key default gen_random_uuid()::text,
  component_id text not null references public.components(id) on delete cascade,
  store_id text not null references public.stores(id) on delete restrict,
  price numeric(12,2) not null check (price > 0),
  pix_price numeric(12,2) check (pix_price > 0),
  installment_price numeric(12,2) check (installment_price > 0),
  installments integer check (installments between 1 and 36),
  shipping_price numeric(12,2) check (shipping_price >= 0),
  product_url text not null check (product_url ~ '^https?://'),
  affiliate boolean not null default false,
  available boolean not null default true,
  last_checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offer_installment_pair check ((installment_price is null and installments is null) or (installment_price is not null and installments is not null))
);

create table public.builds (
  id text primary key default gen_random_uuid()::text,
  public_id text not null unique check (char_length(public_id) between 12 and 80),
  name text not null default 'Minha montagem' check (char_length(name) between 2 and 80),
  estimated_watts integer not null check (estimated_watts >= 0),
  recommended_psu_watts integer not null check (recommended_psu_watts >= 0),
  total_price numeric(12,2) not null check (total_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.build_items (
  id text primary key default gen_random_uuid()::text,
  build_id text not null references public.builds(id) on delete cascade,
  category_id text not null references public.categories(id) on delete restrict,
  component_id text not null references public.components(id) on delete restrict,
  offer_id text references public.offers(id) on delete set null,
  price_snapshot numeric(12,2) check (price_snapshot >= 0),
  created_at timestamptz not null default now(),
  unique (build_id, category_id)
);

create table public.admin_profiles (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

create index components_category_active_idx on public.components(category_id, active);
create index components_search_idx on public.components(lower(brand), lower(name));
create index offers_component_available_price_idx on public.offers(component_id, available, pix_price, price);
create index offers_store_idx on public.offers(store_id);
create index builds_public_id_idx on public.builds(public_id);
create index build_items_build_idx on public.build_items(build_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger components_set_updated_at before update on public.components for each row execute function public.set_updated_at();
create trigger stores_set_updated_at before update on public.stores for each row execute function public.set_updated_at();
create trigger offers_set_updated_at before update on public.offers for each row execute function public.set_updated_at();
create trigger builds_set_updated_at before update on public.builds for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.admin_profiles where user_id = auth.uid() and role in ('admin', 'editor'));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.categories enable row level security;
alter table public.components enable row level security;
alter table public.stores enable row level security;
alter table public.offers enable row level security;
alter table public.builds enable row level security;
alter table public.build_items enable row level security;
alter table public.admin_profiles enable row level security;

create policy "public read categories" on public.categories for select using (true);
create policy "public read active components" on public.components for select using (active or public.is_admin());
create policy "public read active stores" on public.stores for select using (active or public.is_admin());
create policy "public read available offers" on public.offers for select using (available or public.is_admin());
create policy "public read shared builds" on public.builds for select using (true);
create policy "public read shared build items" on public.build_items for select using (true);
create policy "admin manage categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manage components" on public.components for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manage stores" on public.stores for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manage offers" on public.offers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins read own profile" on public.admin_profiles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "admins manage profiles" on public.admin_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke insert, update, delete on public.builds, public.build_items from anon, authenticated;
grant select on public.categories, public.components, public.stores, public.offers, public.builds, public.build_items to anon, authenticated;
grant insert, update, delete on public.categories, public.components, public.stores, public.offers to authenticated;
grant select on public.admin_profiles to authenticated;
