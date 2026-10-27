-- Lama Conecta — esquema base
create extension if not exists pgcrypto;

create type app_role as enum ('admin','direccion','ventas','preventista','logistica','deposito','chofer','cobranzas','cliente','proveedor');
create type customer_kind as enum ('almacen','kiosco','gastronomico','supermercado');
create type customer_status as enum ('pendiente','aprobado','rechazado');
create type product_line as enum ('coca_cola','secos','frescos','congelados');
create type order_channel as enum ('portal','preventa','telefono');
create type order_status as enum ('recibido','en_preparacion','preparado','en_reparto','entregado','con_novedad','anulado');
create type route_status as enum ('planificada','en_curso','finalizada');
create type stop_status as enum ('pendiente','entregada','con_novedad');
create type ticket_kind as enum ('rotura','faltante','demora','consulta','otro');
create type ticket_status as enum ('abierto','respondido','cerrado');
create type telemetry_kind as enum ('ralenti','frenada_brusca','exceso_velocidad');

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table trucks (
  id uuid primary key default gen_random_uuid(),
  plate text not null unique,
  name text not null,
  capacity_kg numeric not null,
  capacity_m3 numeric not null,
  refrigerated boolean not null default false,
  status text not null default 'operativo',
  odometer_km numeric not null default 0
);

create table drivers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  license text,
  phone text,
  truck_id uuid references trucks(id)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'cliente',
  full_name text not null default '',
  email text,
  customer_id uuid,
  driver_id uuid references drivers(id),
  supplier_id uuid references suppliers(id),
  is_owner boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind customer_kind not null default 'almacen',
  address text not null,
  lat double precision,
  lng double precision,
  zone text not null default 'barrios',
  is_satellite boolean not null default false,
  status customer_status not null default 'pendiente',
  seller_id uuid references profiles(id),
  payment_terms_days int not null default 15,
  phone text,
  cuit text,
  created_at timestamptz not null default now()
);
alter table profiles add constraint profiles_customer_fk foreign key (customer_id) references customers(id);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  line product_line not null
);

create table products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  brand text not null,
  category_id uuid not null references categories(id),
  supplier_id uuid references suppliers(id),
  needs_cold boolean not null default false,
  price numeric(12,2) not null check (price >= 0),
  cost numeric(12,2) not null check (cost >= 0),
  stock int not null default 0 check (stock >= 0),
  weight_kg numeric not null default 1,
  volume_m3 numeric not null default 0.01,
  unit text not null default 'bulto',
  low_sugar boolean not null default false,
  image_url text,
  active boolean not null default true
);

create table promotions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  pct numeric not null check (pct > 0 and pct < 100),
  starts_on date not null,
  ends_on date not null
);

create table routes (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  truck_id uuid not null references trucks(id),
  driver_id uuid not null references drivers(id),
  status route_status not null default 'planificada',
  km_planned numeric not null default 0,
  km_real numeric,
  cost numeric(12,2) not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  number serial unique,
  customer_id uuid not null references customers(id),
  created_by uuid references profiles(id),
  channel order_channel not null,
  status order_status not null default 'recibido',
  delivery_date date not null,
  total numeric(12,2) not null default 0,
  route_id uuid references routes(id),
  on_time boolean,
  in_full boolean,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  qty int not null check (qty > 0),
  unit_price numeric(12,2) not null,
  unit_cost numeric(12,2) not null default 0,
  qty_prepared int,
  qty_delivered int
);

create table route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  order_id uuid not null references orders(id),
  seq int not null,
  eta timestamptz,
  delivered_at timestamptz,
  status stop_status not null default 'pendiente',
  note text
);

create table returnables (
  id uuid primary key default gen_random_uuid(),
  route_stop_id uuid not null references route_stops(id) on delete cascade,
  kind text not null,
  qty int not null check (qty >= 0)
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  order_id uuid references orders(id),
  kind ticket_kind not null,
  status ticket_status not null default 'abierto',
  subject text not null,
  created_at timestamptz not null default now()
);

create table ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  order_id uuid references orders(id),
  number text not null unique,
  amount numeric(12,2) not null,
  issued_on date not null,
  due_on date not null
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null,
  method text not null default 'transferencia'
);

create table telemetry_events (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references trucks(id),
  ts timestamptz not null,
  kind telemetry_kind not null,
  value numeric not null default 1
);

create table maintenance_alerts (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid not null references trucks(id),
  severity text not null default 'media',
  message text not null,
  due_in_days int not null default 7,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table settings (
  key text primary key,
  value jsonb not null
);

create table audit_log (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb
);

-- índices sobre FKs y consultas frecuentes
create index on profiles(customer_id);
create index on profiles(driver_id);
create index on profiles(supplier_id);
create index on customers(seller_id);
create index on customers(status);
create index on products(category_id);
create index on products(supplier_id);
create index on promotions(product_id);
create index on orders(customer_id, status, delivery_date);
create index on orders(route_id);
create index on orders(created_by);
create index on orders(delivery_date);
create index on order_items(order_id);
create index on order_items(product_id);
create index on routes(date);
create index on routes(truck_id);
create index on routes(driver_id);
create index on route_stops(route_id);
create index on route_stops(order_id);
create index on returnables(route_stop_id);
create index on tickets(customer_id);
create index on tickets(order_id);
create index on ticket_messages(ticket_id);
create index on ticket_messages(author_id);
create index on invoices(customer_id);
create index on invoices(order_id);
create index on payments(customer_id);
create index on telemetry_events(truck_id, ts);
create index on maintenance_alerts(truck_id);
create index on drivers(truck_id);
create index on audit_log(ts desc);

insert into settings(key, value) values
  ('cost_per_km', '1450'),
  ('driver_day_cost', '85000'),
  ('cutoff_hour', '18'),
  ('satellite_min_kg', '350');
