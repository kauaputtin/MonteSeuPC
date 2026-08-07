-- Integrações externas, histórico e revisão de correspondências.
-- Esta migration é aditiva e preserva todo o catálogo existente.

alter table public.components
  add column if not exists gtin text,
  add column if not exists ean text,
  add column if not exists mpn text,
  add column if not exists model_normalized text,
  add column if not exists specification_status text not null default 'verified',
  add column if not exists specification_sources jsonb not null default '[]'::jsonb,
  add column if not exists is_demo boolean not null default false;

update public.components set is_demo = true where brand ilike '% Demo';

alter table public.components
  add constraint components_specification_status_check check (specification_status in ('verified', 'partial', 'unverified'));

create index if not exists components_gtin_idx on public.components(gtin) where gtin is not null;
create index if not exists components_ean_idx on public.components(ean) where ean is not null;
create index if not exists components_mpn_brand_idx on public.components(lower(mpn), lower(brand)) where mpn is not null;

alter table public.offers
  add column if not exists original_price numeric(12,2),
  add column if not exists original_url text,
  add column if not exists affiliate_url text,
  add column if not exists affiliate_program text,
  add column if not exists affiliate_campaign_id text,
  add column if not exists affiliate_created_at timestamptz,
  add column if not exists affiliate_status text,
  add column if not exists seller_external_id text,
  add column if not exists seller_name text,
  add column if not exists condition text not null default 'new',
  add column if not exists stock_quantity integer,
  add column if not exists source_provider_id text,
  add column if not exists stale_at timestamptz,
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists consecutive_failures integer not null default 0;

alter table public.offers
  add constraint offers_original_price_check check (original_price is null or original_price > 0),
  add constraint offers_affiliate_status_check check (affiliate_status is null or affiliate_status in ('active', 'inactive', 'pending')),
  add constraint offers_condition_check check (condition in ('new', 'used', 'refurbished', 'open_box', 'unknown')),
  add constraint offers_stock_check check (stock_quantity is null or stock_quantity >= 0),
  add constraint offers_original_url_check check (original_url is null or original_url ~ '^https?://'),
  add constraint offers_affiliate_url_check check (affiliate_url is null or affiliate_url ~ '^https?://');

update public.offers set original_url = product_url where original_url is null;

create table public.integration_providers (
  id text primary key,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  integration_type text not null check (integration_type in ('official_api', 'affiliate_api', 'authorized_feed', 'csv', 'manual', 'mock')),
  enabled boolean not null default false,
  configuration_status text not null default 'disabled' check (configuration_status in ('configured', 'missing_credentials', 'manual_only', 'disabled', 'error')),
  capabilities jsonb not null default '{}'::jsonb check (jsonb_typeof(capabilities) = 'object'),
  sync_interval_minutes integer not null default 1440 check (sync_interval_minutes between 15 and 43200),
  next_sync_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.offers add constraint offers_provider_fk foreign key (source_provider_id) references public.integration_providers(id) on delete set null;

create table public.sync_jobs (
  id text primary key default gen_random_uuid()::text,
  provider_id text not null references public.integration_providers(id) on delete restrict,
  job_type text not null check (job_type in ('catalog_sync', 'offer_sync', 'csv_import', 'renormalize', 'health_check')),
  status text not null default 'running' check (status in ('running', 'completed', 'partial', 'failed', 'cancelled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  items_found integer not null default 0 check (items_found >= 0),
  items_created integer not null default 0 check (items_created >= 0),
  items_updated integer not null default 0 check (items_updated >= 0),
  items_ignored integer not null default 0 check (items_ignored >= 0),
  errors_count integer not null default 0 check (errors_count >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  error_message text
);

create unique index sync_jobs_running_lock_idx on public.sync_jobs(provider_id, job_type) where status = 'running';
create index sync_jobs_provider_started_idx on public.sync_jobs(provider_id, started_at desc);

create table public.external_products (
  id text primary key default gen_random_uuid()::text,
  provider_id text not null references public.integration_providers(id) on delete restrict,
  external_id text not null,
  external_sku text,
  gtin text,
  ean text,
  mpn text,
  brand text,
  title text not null check (char_length(title) between 2 and 500),
  model text,
  category text,
  product_url text not null check (product_url ~ '^https?://'),
  image_url text check (image_url is null or image_url ~ '^https?://'),
  specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications) = 'object'),
  normalized_specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(normalized_specifications) = 'object'),
  verification_status text not null default 'unverified' check (verification_status in ('verified', 'partial', 'unverified')),
  raw_payload jsonb,
  component_id text references public.components(id) on delete set null,
  match_status text not null default 'pending' check (match_status in ('pending', 'auto_matched', 'approved', 'rejected', 'separated')),
  match_confidence numeric(5,4) check (match_confidence between 0 and 1),
  sync_job_id text references public.sync_jobs(id) on delete set null,
  fetched_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, external_id)
);

create index external_products_match_queue_idx on public.external_products(match_status, match_confidence desc);
create index external_products_identifiers_idx on public.external_products(gtin, ean, mpn);
create index external_products_component_idx on public.external_products(component_id);

create table public.offer_sources (
  id text primary key default gen_random_uuid()::text,
  provider_id text not null references public.integration_providers(id) on delete restrict,
  external_product_id text not null references public.external_products(id) on delete cascade,
  external_offer_id text not null,
  offer_id text unique references public.offers(id) on delete set null,
  store_id text references public.stores(id) on delete set null,
  seller_external_id text,
  seller_name text,
  price numeric(12,2) not null check (price > 0),
  pix_price numeric(12,2) check (pix_price is null or pix_price > 0),
  original_price numeric(12,2) check (original_price is null or original_price > 0),
  installment_price numeric(12,2) check (installment_price is null or installment_price > 0),
  installments integer check (installments is null or installments between 1 and 36),
  shipping_price numeric(12,2) check (shipping_price is null or shipping_price >= 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  available boolean not null,
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  condition text not null default 'unknown' check (condition in ('new', 'used', 'refurbished', 'open_box', 'unknown')),
  fetched_at timestamptz not null,
  original_url text not null check (original_url ~ '^https?://'),
  affiliate_url text check (affiliate_url is null or affiliate_url ~ '^https?://'),
  affiliate_program text,
  campaign_id text,
  affiliate_created_at timestamptz,
  affiliate_status text check (affiliate_status is null or affiliate_status in ('active', 'inactive', 'pending')),
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  sync_job_id text references public.sync_jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index offer_sources_identity_idx on public.offer_sources(provider_id, external_product_id, external_offer_id);
create index offer_sources_product_idx on public.offer_sources(external_product_id);

create table public.price_history (
  id text primary key default gen_random_uuid()::text,
  offer_id text not null references public.offers(id) on delete cascade,
  price numeric(12,2) not null check (price > 0),
  pix_price numeric(12,2) check (pix_price is null or pix_price > 0),
  original_price numeric(12,2) check (original_price is null or original_price > 0),
  shipping_price numeric(12,2) check (shipping_price is null or shipping_price >= 0),
  available boolean not null,
  captured_at timestamptz not null default now()
);

create index price_history_offer_captured_idx on public.price_history(offer_id, captured_at desc);

create table public.product_match_candidates (
  id text primary key default gen_random_uuid()::text,
  external_product_id text not null references public.external_products(id) on delete cascade,
  component_id text not null references public.components(id) on delete cascade,
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  match_reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(match_reasons) = 'array'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'separated')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (external_product_id, component_id)
);

create index match_candidates_review_idx on public.product_match_candidates(status, confidence desc);

create table public.integration_credentials (
  id text primary key default gen_random_uuid()::text,
  provider_id text not null unique references public.integration_providers(id) on delete cascade,
  encrypted_payload text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.integration_cache (
  id text primary key default gen_random_uuid()::text,
  provider_id text not null references public.integration_providers(id) on delete cascade,
  cache_key text not null,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(provider_id, cache_key)
);

create index integration_cache_expiry_idx on public.integration_cache(expires_at);

create table public.csv_import_batches (
  id text primary key default gen_random_uuid()::text,
  sync_job_id text not null unique references public.sync_jobs(id) on delete cascade,
  file_name text not null,
  content_hash text not null,
  imported_by uuid references auth.users(id) on delete set null,
  reversible_until timestamptz not null default (now() + interval '24 hours'),
  reverted_at timestamptz,
  created_at timestamptz not null default now()
);

create index csv_import_batches_created_idx on public.csv_import_batches(created_at desc);
create unique index csv_import_active_hash_idx on public.csv_import_batches(content_hash) where reverted_at is null;

create table public.admin_audit_log (
  id text primary key default gen_random_uuid()::text,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_created_idx on public.admin_audit_log(created_at desc);

create table public.outbound_events (
  id text primary key default gen_random_uuid()::text,
  offer_id text references public.offers(id) on delete set null,
  provider_id text references public.integration_providers(id) on delete set null,
  destination_host text not null,
  created_at timestamptz not null default now()
);

create or replace function public.capture_offer_price_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare latest public.price_history%rowtype;
begin
  select * into latest from public.price_history where offer_id = new.id order by captured_at desc limit 1;
  if latest.id is null
    or latest.price is distinct from new.price
    or latest.pix_price is distinct from new.pix_price
    or latest.original_price is distinct from new.original_price
    or latest.shipping_price is distinct from new.shipping_price
    or latest.available is distinct from new.available then
    insert into public.price_history(offer_id, price, pix_price, original_price, shipping_price, available, captured_at)
    values(new.id, new.price, new.pix_price, new.original_price, new.shipping_price, new.available, coalesce(new.last_checked_at, now()));
  end if;
  return new;
end;
$$;

create trigger offers_capture_price after insert or update of price, pix_price, original_price, shipping_price, available on public.offers
for each row execute function public.capture_offer_price_change();

create trigger integration_providers_set_updated_at before update on public.integration_providers for each row execute function public.set_updated_at();
create trigger external_products_set_updated_at before update on public.external_products for each row execute function public.set_updated_at();
create trigger offer_sources_set_updated_at before update on public.offer_sources for each row execute function public.set_updated_at();
create trigger integration_credentials_set_updated_at before update on public.integration_credentials for each row execute function public.set_updated_at();

alter table public.integration_providers enable row level security;
alter table public.external_products enable row level security;
alter table public.offer_sources enable row level security;
alter table public.price_history enable row level security;
alter table public.sync_jobs enable row level security;
alter table public.product_match_candidates enable row level security;
alter table public.integration_credentials enable row level security;
alter table public.integration_cache enable row level security;
alter table public.csv_import_batches enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.outbound_events enable row level security;

create policy "admin manage integration providers" on public.integration_providers for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manage external products" on public.external_products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manage offer sources" on public.offer_sources for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public read price history" on public.price_history for select using (true);
create policy "admin manage price history" on public.price_history for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manage sync jobs" on public.sync_jobs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manage match candidates" on public.product_match_candidates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin manage csv batches" on public.csv_import_batches for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin read audit" on public.admin_audit_log for select to authenticated using (public.is_admin());
create policy "admin write audit" on public.admin_audit_log for insert to authenticated with check (public.is_admin());

grant select, insert, update, delete on public.integration_providers, public.external_products, public.offer_sources, public.sync_jobs, public.product_match_candidates, public.csv_import_batches to authenticated;
grant select on public.price_history to anon, authenticated;
grant insert, update, delete on public.price_history to authenticated;
grant select, insert on public.admin_audit_log to authenticated;
revoke all on public.integration_credentials, public.integration_cache from anon, authenticated;
revoke all on public.outbound_events from anon, authenticated;

insert into public.integration_providers(id, name, slug, integration_type, enabled, configuration_status, capabilities, sync_interval_minutes) values
('mercado-livre', 'Mercado Livre', 'mercado-livre', 'official_api', false, 'missing_credentials', '{"productSearch":true,"productDetails":true,"offers":true,"stock":true,"technicalSpecifications":true,"images":true,"affiliateLinks":false}', 360),
('amazon', 'Amazon Brasil', 'amazon', 'affiliate_api', false, 'missing_credentials', '{"productSearch":false,"productDetails":false,"offers":false,"stock":false,"technicalSpecifications":false,"images":false,"affiliateLinks":false}', 360),
('kabum', 'KaBuM!', 'kabum', 'authorized_feed', false, 'missing_credentials', '{"productSearch":false,"productDetails":false,"offers":false,"stock":false,"technicalSpecifications":false,"images":false,"affiliateLinks":false}', 720),
('pichau', 'Pichau', 'pichau', 'manual', false, 'manual_only', '{}', 1440),
('terabyte', 'TerabyteShop', 'terabyte', 'manual', false, 'manual_only', '{}', 1440),
('magalu', 'Magalu', 'magalu', 'manual', false, 'manual_only', '{}', 1440),
('csv', 'Feed CSV autorizado', 'csv', 'csv', true, 'manual_only', '{"productSearch":false,"productDetails":true,"offers":true,"stock":true,"technicalSpecifications":true,"images":true,"affiliateLinks":true}', 1440),
('mock', 'Fixtures de desenvolvimento', 'mock', 'mock', false, 'disabled', '{"productSearch":true,"productDetails":true,"offers":true,"stock":true,"technicalSpecifications":true,"images":true,"affiliateLinks":false}', 1440)
on conflict (id) do update set name = excluded.name, capabilities = excluded.capabilities;

insert into public.stores(id, name, slug, website_url, active) values
('store-mercado-livre', 'Mercado Livre', 'mercado-livre', 'https://www.mercadolivre.com.br', true)
on conflict (id) do nothing;
