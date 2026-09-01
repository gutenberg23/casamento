-- ============================================================
-- Schema do hotsite Iasmin & Gutenberg
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase
-- (Supabase Dashboard > SQL Editor > New query > colar > Run)
-- ============================================================

-- Catálogo de presentes -----------------------------------------------------
create table if not exists gifts (
  id text primary key,
  name text not null,
  description text not null default '',
  price_cents integer not null,          -- preço sugerido, em centavos
  unique_item boolean not null default true, -- true = só pode ser comprado uma vez
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into gifts (id, name, description, price_cents, unique_item, sort_order) values
  ('panelas',        'Jogo de panelas',        'Um conjunto bom, dos que duram anos.',                         35000, true, 1),
  ('airfryer',       'Air fryer',               'Pra facilitar o dia a dia na cozinha nova.',                   45000, true, 2),
  ('liquidificador',  'Liquidificador',          'Vitamina de manhã não pode faltar.',                          22000, true, 3),
  ('cafeteira',      'Cafeteira',               'Café fresquinho todo santo dia.',                              28000, true, 4),
  ('jogocama',       'Jogo de cama casal',      'Lençol bom pra dormir bem.',                                   25000, true, 5),
  ('toalhas',        'Jogo de toalhas',         'Pro banheiro novo ficar completo.',                            18000, true, 6),
  ('aspirador',      'Robô aspirador',          'Aquele mimo que ninguém se arrepende de dar.',                 90000, true, 7),
  ('churrasco',      'Kit churrasco',           'Pra receber a família no fim de semana.',                      20000, true, 8),
  ('luademel',       'Cota lua de mel',         'Contribua com o valor que quiser pra nossa viagem.',           10000, false, 9)
on conflict (id) do nothing;

-- Pedidos / pagamentos -------------------------------------------------------
create table if not exists gift_orders (
  id uuid primary key default gen_random_uuid(),
  gift_id text not null references gifts(id) on delete cascade,
  buyer_name text not null,
  amount_cents integer not null,
  installments integer,
  payment_method text not null default 'pix_direct',
  buyer_message text,
  status text not null default 'pending', -- pending | approved | rejected | cancelled
  mp_preference_id text,
  mp_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Adiciona colunas se a tabela já existia antes
alter table gift_orders add column if not exists payment_method text not null default 'pix_direct';
alter table gift_orders add column if not exists buyer_message text;

create index if not exists idx_gift_orders_gift_id on gift_orders(gift_id);
create index if not exists idx_gift_orders_status on gift_orders(status);

-- Confirmações de presença ---------------------------------------------------
create table if not exists rsvps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  attending boolean not null,
  guests integer not null default 1,
  message text,
  created_at timestamptz not null default now()
);

-- View que calcula o que está ocupado/aprovado
create or replace view gift_status as
select
  g.*,
  o.id as order_id,
  o.buyer_name,
  o.status as order_status,
  o.amount_cents as order_amount_cents,
  o.payment_method,
  o.installments
from gifts g
left join lateral (
  select *
  from gift_orders go
  where go.gift_id = g.id
    and (
      go.status = 'approved'
      or (go.status = 'pending' and go.created_at > now() - interval '30 minutes')
    )
  order by go.created_at desc
  limit 1
) o on true;

-- Row Level Security (RLS) ---------------------------------------------------
alter table gifts enable row level security;
alter table gift_orders enable row level security;
alter table rsvps enable row level security;

-- Limpar policies antigas se existirem
drop policy if exists "gifts are publicly readable" on gifts;
drop policy if exists "anyone can manage gifts" on gifts;
drop policy if exists "gift orders are publicly readable" on gift_orders;
drop policy if exists "anyone can insert gift orders" on gift_orders;
drop policy if exists "anyone can update gift orders" on gift_orders;
drop policy if exists "anyone can manage gift orders" on gift_orders;
drop policy if exists "rsvps are publicly readable" on rsvps;
drop policy if exists "anyone can rsvp" on rsvps;

-- Permissões completas para acesso pelo site
create policy "gifts are publicly readable" on gifts
  for select using (true);

create policy "anyone can manage gifts" on gifts
  for all using (true) with check (true);

create policy "gift orders are publicly readable" on gift_orders
  for select using (true);

create policy "anyone can manage gift orders" on gift_orders
  for all using (true) with check (true);

create policy "rsvps are publicly readable" on rsvps
  for select using (true);

create policy "anyone can rsvp" on rsvps
  for insert with check (true);

-- Habilita Realtime
do $$
begin
  alter publication supabase_realtime add table gift_orders;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table rsvps;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table gifts;
exception
  when duplicate_object then null;
end $$;
