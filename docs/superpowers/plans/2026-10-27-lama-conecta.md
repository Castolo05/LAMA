# Lama Conecta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plataforma web por roles "Lama Logística y Distribución" (proyecto interno Lama Conecta) con portal de clientes, preventa, depósito, ruteo, chofer, flota, BI, proveedores y administración, funcional sobre Supabase y publicada en Vercel desde GitHub.

**Architecture:** Next.js App Router con server components y server actions; Supabase (Postgres + Auth) con RLS en todas las tablas y RPCs `security definer` para transiciones de estado; la lógica pura (carrito, fechas de corte, ruteo, KPIs, generación de seed) vive en `src/lib/*` con tests Vitest. El seed se genera como SQL determinístico desde TypeScript y se aplica vía Supabase MCP (incluye usuarios en `auth.users`, sin necesidad de service key).

**Tech Stack:** Next.js 15 + TypeScript, Tailwind CSS v4, `@supabase/ssr` + `@supabase/supabase-js`, Recharts, Leaflet + react-leaflet (OpenStreetMap), lucide-react, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-27-lama-conecta-design.md`

## Global Constraints

- Título visible: "Lama Logística y Distribución" (metadata `title`, header, landing). "Lama Conecta" solo en repo/README.
- Toda la UI en español rioplatense.
- Colores: `--lama-red #DA2128`, `--lama-ink #1A1A1A`, `--lama-steel #7A7A7A`, `--lama-cloud #F4F5F7`, `--lama-white #FFFFFF`. Títulos Montserrat (destacados en itálica 800), cuerpo Inter (`next/font/google`).
- Favicon/ícono PWA: isotipo "L" roja recortada de `docs/Logotipo.png`.
- RLS habilitada en todas las tablas del esquema `public`; la `service_role` nunca llega al navegador.
- Roles exactos: `admin, direccion, ventas, preventista, logistica, deposito, chofer, cobranzas, cliente, proveedor`.
- Estados de pedido exactos: `recibido, en_preparacion, preparado, en_reparto, entregado, con_novedad, anulado`.
- Canales: `portal, preventa, telefono`.
- Depósito (origen de rutas): Figueroa 651, Tandil — lat -37.3217, lng -59.1332.
- Horario de corte 18:00 (America/Argentina/Buenos_Aires) → entrega siguiente día hábil (lun–sáb); ventana centro: antes de 10:00.
- Localidades satélite: Gardey, María Ignacia (Vela), Barker, De la Canal, Azucena, Fulton.
- Fuera de alcance: Lama Crédito, Marketplace, GPS real, emails/WhatsApp automáticos, offline, 2FA (mostrar "Próximamente").
- Botones de acceso demo por rol visibles en `/ingresar`; cualquiera puede usarlos. Sin comando de reseteo.

## Review Focus

- Cliente A intentando ver/editar pedidos, cuenta o reclamos del cliente B → RLS devuelve vacío / error (test SQL en Task 2).
- Comercio `pendiente` intentando hacer un pedido → bloqueado en servidor con mensaje claro (test SQL en Task 3, UI en Task 6).
- Pedido con carrito vacío, cantidad ≤ 0 o más que el stock → rechazado por `place_order` (test SQL en Task 3; `validateCart` en Task 6).
- Planificador con pedidos de frío sin capacidad refrigerada suficiente, o un pedido más pesado que cualquier camión → quedan en `unassigned` con motivo, nunca se pierden ni se sobrecargan (tests en Task 9).
- Pantallas en 375px de ancho (cliente, preventista, chofer) → sin scroll horizontal, navegación inferior usable (verificación en navegador en Tasks 6, 7, 10).

---

### Task 0: Repositorio, scaffold y sistema visual

**Files:**
- Move: `contexto_lama_nodo_sur.md`, `BrandingLama.jpeg`, `Logotipo.png` → `docs/`
- Create: Next.js app en la raíz (`package.json`, `src/app/layout.tsx`, `src/app/globals.css`, `next.config.ts`, `vitest.config.ts`, `.env.example`, `.gitignore`, `README.md`)
- Create: `public/brand/logo.png`, `public/brand/isotipo.png`, `src/app/icon.png`, `src/components/ui/{Button,Card,Input,Badge,PageHeader,EmptyState,Stat}.tsx`
- Test: `src/lib/format.test.ts`

**Interfaces:**
- Produces: `formatARS(n: number): string` (ej. `"$ 1.234,50"`), `formatDate(d: string|Date): string` (`"27/10/2026"`), `cn(...c): string` en `src/lib/format.ts` / `src/lib/cn.ts`. Componentes UI con variantes `Button variant="primary"|"outline"|"dark"|"ghost"`.

- [ ] **Step 1:** `git init`, mover archivos a `docs/`, `npx create-next-app@15` (TS, Tailwind, App Router, `src/`, sin ESLint interactivo) en carpeta temporal y mover a la raíz; `npm i @supabase/ssr @supabase/supabase-js recharts leaflet react-leaflet lucide-react` y `npm i -D vitest @types/leaflet`.
- [ ] **Step 2:** Recortar isotipo "L" de `docs/Logotipo.png` (Python/PIL o sharp) a `public/brand/isotipo.png` y `src/app/icon.png` (512×512, fondo transparente).
- [ ] **Step 3: Write failing test** `format.test.ts`: `formatARS(1234.5) === "$ 1.234,50"`; `formatDate("2026-10-27") === "27/10/2026"`.
- [ ] **Step 4:** Run `npx vitest run src/lib/format.test.ts` → FAIL; implement; run → PASS.
- [ ] **Step 5:** Tokens de marca en `globals.css` (`@theme`), fuentes en `layout.tsx`, metadata title "Lama Logística y Distribución", componentes UI. Invocar skill `frontend-design` antes de diseñar componentes.
- [ ] **Step 6:** `npm run build` → éxito. Commit `chore: scaffold Next.js app with Lama brand system`, `git remote add origin https://github.com/Castolo05/LAMA.git`, `git push -u origin main`.

### Task 1: Proyecto Supabase y esquema

**Files:**
- Create: `supabase/migrations/0001_schema.sql`, `src/lib/types.ts`

**Interfaces:**
- Produces: tablas de spec §5.5 con estos nombres/columnas clave:
  - `profiles(id uuid pk → auth.users, role app_role, full_name, email, customer_id, driver_id, supplier_id, is_owner bool, active bool)`
  - `customers(id, name, kind customer_kind['almacen','kiosco','gastronomico','supermercado'], address, lat, lng, zone text, is_satellite bool, status customer_status['pendiente','aprobado','rechazado'], seller_id uuid → profiles, payment_terms_days int, phone, created_at)`
  - `suppliers(id, name)`, `categories(id, name, line product_line['coca_cola','secos','frescos','congelados'])`
  - `products(id, sku, name, brand, category_id, supplier_id, needs_cold bool, price numeric, cost numeric, stock int, weight_kg numeric, volume_m3 numeric, unit text, low_sugar bool, image_url, active bool)`
  - `promotions(id, product_id, pct numeric, starts_on date, ends_on date)`
  - `orders(id, number serial, customer_id, created_by, channel order_channel, status order_status, delivery_date date, total numeric, route_id, on_time bool, in_full bool, delivered_at timestamptz, created_at)`; `order_items(id, order_id, product_id, qty int, unit_price, qty_prepared int, qty_delivered int)`
  - `trucks(id, plate, name, capacity_kg, capacity_m3, refrigerated bool, status, odometer_km)`; `drivers(id, full_name, license, truck_id)`
  - `routes(id, date, truck_id, driver_id, status route_status['planificada','en_curso','finalizada'], km_planned, km_real, cost, started_at, finished_at)`; `route_stops(id, route_id, order_id, seq, eta timestamptz, delivered_at, status stop_status['pendiente','entregada','con_novedad'])`
  - `returnables(id, route_stop_id, kind, qty)`, `tickets(id, customer_id, order_id, kind ticket_kind['rotura','faltante','demora','consulta','otro'], status ticket_status['abierto','respondido','cerrado'], subject, created_at)`, `ticket_messages(id, ticket_id, author_id, body, created_at)`
  - `invoices(id, customer_id, order_id, number, amount, issued_on, due_on)`, `payments(id, customer_id, amount, paid_on, method)`
  - `telemetry_events(id, truck_id, ts, kind['ralenti','frenada_brusca','exceso_velocidad'], value)`, `maintenance_alerts(id, truck_id, severity, message, due_in_days, resolved bool)`
  - `settings(key text pk, value jsonb)` con `cost_per_km`, `driver_day_cost`, `cutoff_hour`, `satellite_min_kg`
  - `audit_log(id, ts, actor_id, action text, entity text, entity_id text, detail jsonb)`
  - `src/lib/types.ts`: `Role`, `OrderStatus`, `Channel` y tipos de fila (escritos a mano o vía `generate_typescript_types`).

- [ ] **Step 1:** Crear proyecto Supabase "lama" (`sa-east-1`, org `xnetsrksvmlpccugexoe`) vía MCP (`get_cost` → `confirm_cost` → `create_project`); esperar ACTIVE_HEALTHY.
- [ ] **Step 2:** Escribir `0001_schema.sql` (enums, tablas, FKs, índices en FKs y `orders(customer_id,status,delivery_date)`); aplicar con `apply_migration`.
- [ ] **Step 3:** Verificar con `list_tables` → todas las tablas presentes. Generar tipos a `src/lib/database.types.ts`.
- [ ] **Step 4:** Commit `feat(db): base schema`.

### Task 2: RLS, helpers y auditoría

**Files:**
- Create: `supabase/migrations/0002_rls.sql`, `supabase/tests/rls.sql`

**Interfaces:**
- Produces: funciones `security definer stable`: `auth_role() returns app_role`, `auth_customer_id() returns uuid`, `auth_driver_id()`, `auth_supplier_id()`, `is_staff() returns bool` (todo rol excepto cliente/proveedor/chofer). Trigger `audit()` en `products`(update price), `profiles`(insert/update role/active), `customers`(update status), `orders`(update a `anulado`).

Políticas (mapeo de la matriz 11.3):
- `products/categories/suppliers/promotions`: select para todos los autenticados excepto `chofer`/`proveedor`; write `admin, ventas`.
- `customers`: select staff; preventista solo `seller_id = auth.uid()`; cliente solo `id = auth_customer_id()`; update `admin, ventas`.
- `orders/order_items`: select staff; preventista sus clientes; cliente los suyos; chofer los de sus rutas; insert solo vía RPC.
- `routes/route_stops`: select `admin, direccion, logistica, deposito, ventas`; chofer `driver_id = auth_driver_id()`; write `admin, logistica`.
- `tickets/ticket_messages`: staff `admin, direccion, ventas, logistica`; cliente propios (insert propio).
- `invoices/payments`: `admin, direccion, ventas, cobranzas`; cliente propios (select); write `cobranzas, admin`.
- `telemetry_events/maintenance_alerts/trucks/drivers`: `admin, direccion, logistica`; trucks/drivers select también `deposito`.
- `profiles`: propio; `admin` todo; cliente titular ve/inserta los de su comercio.
- `audit_log`: select `admin, direccion`. `settings`: select staff, write admin.
- Proveedor: sin select en tablas transaccionales.

- [ ] **Step 1: Write failing test** `supabase/tests/rls.sql`: bloque que crea dos clientes y un proveedor temporales, hace `set local role authenticated; set local request.jwt.claims = '{"sub":"<uidA>"}'` y asevera con `raise exception` si `select count(*) from orders where customer_id = <B>` > 0, si proveedor ve `orders` > 0, y si chofer ve `invoices` > 0; termina en `rollback`.
- [ ] **Step 2:** Run vía `execute_sql` → falla (sin RLS, el cliente A ve pedidos de B).
- [ ] **Step 3:** Escribir y aplicar `0002_rls.sql`.
- [ ] **Step 4:** Re-run test → sin excepción. Correr `get_advisors(security)` → sin tablas sin RLS.
- [ ] **Step 5:** Commit `feat(db): row level security by role`.

### Task 3: RPCs de negocio

**Files:**
- Create: `supabase/migrations/0003_rpc.sql`, `supabase/tests/rpc.sql`

**Interfaces:**
- Produces (todas `security definer`, validan `auth_role()` y pertenencia):
  - `place_order(p_customer uuid, p_items jsonb /*[{product_id,qty}]*/, p_channel order_channel) returns uuid` — cliente solo su comercio y aprobado; preventista solo sus clientes; ventas cualquiera (canal `telefono`). Rechaza vacío, qty ≤ 0, stock insuficiente, comercio no aprobado. Aplica promoción vigente, calcula `delivery_date` con corte 18:00 → siguiente día hábil (lun–sáb).
  - `cancel_order(p_order uuid) returns void` — cliente si `recibido`; ventas/admin hasta `preparado`.
  - `prepare_order(p_order uuid, p_prepared jsonb /*[{item_id,qty_prepared}]*/) returns void` — depósito; descuenta stock; si falta algo, status `preparado` y crea ticket `faltante` informativo.
  - `confirm_routes(p_date date, p_plan jsonb /*[{truck_id,driver_id,km,cost,stops:[{order_id,seq,eta}]}]*/) returns int` — logística; crea routes + stops, asigna `orders.route_id`.
  - `start_route(p_route uuid)` → pedidos `en_reparto`; `deliver_stop(p_stop uuid, p_items jsonb /*[{item_id,qty_delivered}]*/, p_returnables jsonb, p_note text)` — chofer de esa ruta; marca `entregado`/`con_novedad`, `on_time = delivered_at <= eta + 30 min`, `in_full = todas qty_delivered = qty`; crea invoice; `finish_route(p_route uuid, p_km_real numeric)`.
  - `approve_customer(p_customer uuid, p_approve bool)` — ventas/admin.
  - `register_customer(p_name, p_kind, p_address, p_phone) returns uuid` — llamado por usuario recién registrado sin comercio; crea `customers` pendiente y lo vincula en `profiles` con `is_owner = true`.
  - `owner_add_employee(p_email text, p_full_name text, p_password text) returns uuid` — solo cliente titular; crea usuario en `auth.users` con rol `cliente`, mismo `customer_id`, `is_owner = false`.

- [ ] **Step 1: Write failing test** `supabase/tests/rpc.sql` (rollback al final) asevera: `place_order` con comercio pendiente → excepción con mensaje `'Comercio pendiente de aprobación'`; con `'[]'` → `'El pedido está vacío'`; qty mayor al stock → `'Stock insuficiente'`; pedido válido creado un martes 19:00 → `delivery_date` jueves; creado sábado 10:00 → lunes; `deliver_stop` completo y a tiempo → `on_time and in_full`.
- [ ] **Step 2:** Run → falla (funciones inexistentes).
- [ ] **Step 3:** Implementar y aplicar `0003_rpc.sql`.
- [ ] **Step 4:** Re-run → pasa. Commit `feat(db): business RPCs`.

### Task 4: Generador de seed

**Files:**
- Create: `scripts/seed/rng.ts`, `scripts/seed/data.ts` (comercios, productos, camiones), `scripts/seed/generate.ts`, `scripts/seed/build-sql.ts`, `supabase/seed.sql` (generado)
- Test: `scripts/seed/generate.test.ts`

**Interfaces:**
- Produces: `generateDataset(seed: number, today: Date): Dataset` y `toSql(ds: Dataset): string`; `npm run seed:build` escribe `supabase/seed.sql`. Usuarios demo insertados en `auth.users` + `auth.identities` con `crypt(password, gen_salt('bf'))`, email `<rol>@demo.lama.com.ar`, contraseña común `DemoLama2026!` registrada en `scripts/seed/data.ts` y README. Exporta `DEMO_ACCOUNTS: {role, email, label}[]` desde `src/lib/demo.ts` (usado por Task 5).

Contenido (spec §5.6): ~45 comercios Tandil + 8 satélites (3 pendientes), ~80 productos 4 líneas, 4 proveedores (Coca-Cola FEMSA, lácteos, fiambres/quesos, congelados), 6 camiones (3 refrigerados), 6 choferes, 3 preventistas, 180 días de pedidos con canal digital creciendo de ~5% a ~45% y OTIF de ~82% a ~93%, rutas/entregas/facturas/pagos históricos, telemetría y alertas, y para hoy: pedidos en cada estado, una ruta `en_curso`, ≥15 pedidos `preparado` para mañana. Cuentas demo: una por rol + `cliente2`.

- [ ] **Step 1: Write failing test**: mismo seed → mismo dataset (determinismo); hay exactamente 3 comercios pendientes; ningún pedido referencia producto inexistente; existe al menos una ruta `en_curso` hoy; share digital del último mes > 0.35 y del primero < 0.12; `DEMO_ACCOUNTS` cubre los 10 roles.
- [ ] **Step 2:** `npx vitest run scripts/seed` → FAIL; implementar; → PASS.
- [ ] **Step 3:** `npm run seed:build`; aplicar `supabase/seed.sql` vía `execute_sql` (por partes si es grande); verificar conteos con SQL y que `place_order` se puede llamar como `cliente@demo...`.
- [ ] **Step 4:** Commit `feat: deterministic demo seed`.

### Task 5: Auth, shell por rol, ingreso y registro

**Files:**
- Create: `src/lib/supabase/{server,client,middleware}.ts`, `src/middleware.ts`, `src/lib/nav.ts`, `src/lib/session.ts`, `src/app/ingresar/page.tsx`, `src/app/registro/page.tsx`, `src/app/(app)/layout.tsx`, `src/components/shell/{Sidebar,BottomNav,UserMenu}.tsx`, `src/app/(app)/en-revision/page.tsx`
- Test: `src/lib/nav.test.ts`

**Interfaces:**
- Consumes: `DEMO_ACCOUNTS` (Task 4), `Role`.
- Produces: `getSession(): Promise<{user, profile: Profile} | null>` y `requireRole(roles: Role[]): Promise<Profile>` (redirige a `/ingresar` o `/inicio`); `navForRole(role: Role): NavItem[]` con `{href,label,icon}`; `homeForRole(role): string`. Rutas bajo `src/app/(app)/`: `/inicio`, `/catalogo`, `/carrito`, `/pedidos`, `/pedidos/[id]`, `/reclamos`, `/cuenta`, `/mi-comercio`, `/preventa`, `/ventas/clientes`, `/ventas/reclamos`, `/ventas/pedido-telefonico`, `/ventas/precios`, `/deposito`, `/logistica/planificador`, `/logistica/rutas`, `/flota`, `/chofer`, `/cobranzas`, `/bi`, `/proveedor`, `/admin/usuarios`, `/admin/catalogo`, `/admin/parametros`, `/admin/auditoria`.

- [ ] **Step 1: Write failing test** `nav.test.ts`: `navForRole('cliente')` contiene `/catalogo,/pedidos,/reclamos,/cuenta` y no `/bi`; `navForRole('proveedor')` es solo `/proveedor`; `navForRole('chofer')` es solo `/chofer`; `navForRole('direccion')` incluye `/bi,/admin/auditoria` y no `/admin/usuarios`; `navForRole('admin')` incluye `/admin/usuarios`.
- [ ] **Step 2:** Run → FAIL; implementar `nav.ts`; → PASS.
- [ ] **Step 3:** Clientes Supabase SSR, middleware de refresco de sesión, `/ingresar` (form + grilla "Cuentas de demostración", cada botón hace `signInWithPassword` en server action y redirige a `homeForRole`), `/registro` (signUp + `register_customer`; con confirmación de email desactivada en Supabase Auth vía config), shell con Sidebar (≥768px) / BottomNav (<768px), cliente pendiente → `/en-revision`.
- [ ] **Step 4:** Verificar en navegador (`npm run dev`): entrar con cada botón demo y ver el menú correcto. Commit `feat: auth and role-based shell`.

### Task 6: Landing pública y Portal de clientes

**Files:**
- Create: `src/app/page.tsx`, `src/components/landing/*`, `src/lib/cart.ts`, `src/lib/delivery.ts`, `src/lib/suggestions.ts`, `src/components/cart/CartProvider.tsx`, páginas cliente (`/inicio`, `/catalogo`, `/carrito`, `/pedidos`, `/pedidos/[id]`, `/reclamos`, `/reclamos/[id]`, `/cuenta`, `/mi-comercio`), `src/components/tracking/TruckMap.tsx`, `src/components/catalog/{ProductGrid,ProductCard,Filters}.tsx`, `src/components/orders/StatusTimeline.tsx`
- Test: `src/lib/cart.test.ts`, `src/lib/delivery.test.ts`, `src/lib/suggestions.test.ts`

**Interfaces:**
- Produces: `cartTotals(lines: CartLine[], promos: Promo[], today: string): {subtotal, discount, total, bultos, weightKg}`; `validateCart(lines, stockById): string[]` (mensajes de error); `nextDeliveryDate(now: Date): string` (misma regla que `place_order`); `suggestReorder(history: {product_id, ordered_on}[], today: string, limit=6): string[]` (productos con ≥3 compras cuyo intervalo medio ya venció); `interpolatePosition(stops: LatLng[], progress: number): LatLng` y `etaForStop(...)` en `TruckMap`. `CartProvider` persiste en `localStorage` (try/catch). Componentes de catálogo, `StatusTimeline` y `TruckMap` se reutilizan en Tasks 7 y 10.

- [ ] **Step 1: Write failing tests**: `cartTotals` aplica 10% de promo vigente y no la vencida; `validateCart` devuelve `"Stock insuficiente: Coca-Cola 2,25 L"` cuando qty > stock y `"El carrito está vacío"` con `[]`; `nextDeliveryDate` martes 17:59 → miércoles, martes 18:00 → jueves, sábado 19:00 → martes (domingo no hábil); `suggestReorder` devuelve producto comprado cada 7 días y no pedido hace 10.
- [ ] **Step 2:** Run → FAIL; implementar; → PASS.
- [ ] **Step 3:** Invocar skill `design-taste-frontend` para la landing; construir landing (hero con camión, líneas, cobertura, contacto real de Lama, CTAs Ingresar/Registrar mi comercio).
- [ ] **Step 4:** Páginas cliente usando `place_order`, `cancel_order`, tickets, cuenta (facturas − pagos = saldo), `/mi-comercio` (titular agrega empleados con `owner_add_employee`), reclamos con botones "Llamar" (`tel:+542494451556`) y "WhatsApp" (`https://wa.me/542494451556`). "Repetir último pedido" carga el carrito. `TruckMap` (Leaflet dinámico `ssr:false`) anima un camión entre las paradas de la ruta del pedido con ETA; se muestra solo en `en_reparto`.
- [ ] **Step 5:** Verificar en navegador a 375px y desktop: cliente demo hace un pedido completo; `cliente2` no lo ve; comercio pendiente es redirigido a `/en-revision`. Commit `feat: landing and customer portal`.

### Task 7: Preventa, Ventas y Cobranzas

**Files:**
- Create: `/preventa`, `/preventa/[clienteId]`, `/ventas/clientes`, `/ventas/reclamos`, `/ventas/pedido-telefonico`, `/ventas/precios`, `/cobranzas`, `src/lib/aging.ts`
- Test: `src/lib/aging.test.ts`

**Interfaces:**
- Consumes: catálogo/carrito de Task 6, `place_order`, `approve_customer`.
- Produces: `agingBuckets(invoices, payments, today): {corriente, d1_30, d31_60, d60_mas}` (pagos aplicados FIFO).

- [ ] **Step 1: Write failing test** `aging.test.ts`: factura vencida hace 45 días impaga → `d31_60`; pago que cubre la más vieja la saca del bucket.
- [ ] **Step 2:** Run → FAIL; implementar; → PASS.
- [ ] **Step 3:** Preventa mobile-first (mis clientes → ficha → tomar pedido canal `preventa`); Ventas: aprobación de pendientes, bandeja de reclamos con respuesta (status `respondido`), pedido telefónico eligiendo cliente, precios y promociones; Cobranzas: tabla de saldos, aging, registrar pago.
- [ ] **Step 4:** Verificar: preventista solo ve sus clientes; aprobar un pendiente le habilita pedir. Commit `feat: presale, sales and collections`.

### Task 8: Depósito

**Files:**
- Create: `/deposito`, `/deposito/[pedidoId]`

**Interfaces:**
- Consumes: `prepare_order`.

- [ ] **Step 1:** Cola de pedidos `recibido/en_preparacion` agrupada por fecha de entrega, con pestañas Secos / Frescos / Frío (según `needs_cold` y línea); detalle con checklist por ítem y cantidad preparada.
- [ ] **Step 2:** Verificar: preparar con un faltante → pedido `preparado`, stock descontado y ticket de faltante visible para el cliente. Commit `feat: warehouse picking`.

### Task 9: Planificador de rutas

**Files:**
- Create: `src/lib/routing.ts`, `/logistica/planificador`, `/logistica/rutas`, `src/components/maps/RouteMap.tsx`
- Test: `src/lib/routing.test.ts`

**Interfaces:**
- Produces: `planRoutes(input: { orders: PlanOrder[]; trucks: PlanTruck[]; drivers: {id}[]; depot: LatLng; date: string; settings: {costPerKm, driverDayCost, satelliteMinKg} }): Plan` donde `PlanOrder = {id, customerName, lat, lng, zone, isSatellite, weightKg, volumeM3, needsCold}`, `PlanTruck = {id, name, capacityKg, capacityM3, refrigerated}`, `Plan = { routes: {truckId, driverId, stops: {orderId, seq, eta}[], km, cost, loadKg, loadM3}[]; deferred: {orderId, reason, savingArs}[]; unassigned: {orderId, reason}[]; totals: {km, cost, bultos} }`. `haversineKm(a,b)`; km de ruta = suma haversine × 1.3 (ida y vuelta al depósito).

Algoritmo:
1. Satélites: agrupar por localidad; si `sum(weightKg) < satelliteMinKg` → `deferred` con `savingArs = 2 × haversine(depot, localidad) × 1.3 × costPerKm`.
2. Pedidos con `needsCold` → solo camiones `refrigerated`; secos llenan primero no refrigerados y luego el sobrante de refrigerados.
3. Asignación first-fit decreasing por peso respetando kg y m³; lo que no entra → `unassigned` con `'Sin capacidad refrigerada'` o `'Excede capacidad de los camiones'`.
4. Orden por camión: primero zona `centro` por vecino más cercano desde el depósito, luego el resto por vecino más cercano.
5. ETA: salida 07:30, 25 km/h urbano, 60 km/h tramos a satélite, 8 min por parada.

- [ ] **Step 1: Write failing tests**: pedido frío nunca asignado a camión no refrigerado; si no hay capacidad refrigerada → `unassigned` con `'Sin capacidad refrigerada'`; pedido de 9000 kg con camiones de 6000 → `'Excede capacidad de los camiones'`; ninguna ruta supera `capacityKg`; paradas `centro` antes que barrios; satélite con 50 kg y umbral 300 → `deferred`; la suma de pedidos ruteados + deferred + unassigned = total de entrada.
- [ ] **Step 2:** Run → FAIL; implementar; → PASS.
- [ ] **Step 3:** UI: elegir fecha → cargar pedidos `preparado` sin ruta → "Generar rutas" → mapa con polilíneas por camión + lista editable (reasignar camión/chofer, subir/bajar parada recalculando km/ETA) + paneles "Postergados" y "Sin asignar" → "Confirmar" llama `confirm_routes`. `/logistica/rutas`: rutas del día con estado y botón "Iniciar ruta" (`start_route`).
- [ ] **Step 4:** Verificar en navegador con los pedidos sembrados para mañana. Commit `feat: dynamic route planner`.

### Task 10: App del chofer

**Files:**
- Create: `/chofer`, `/chofer/parada/[id]`

**Interfaces:**
- Consumes: `deliver_stop`, `finish_route`, `start_route`.

- [ ] **Step 1:** Mobile-first: ruta del día con paradas ordenadas, progreso, botón "Navegar" (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`); detalle de parada con cantidades entregadas editables, envases retornables (cajones, bidones), nota de novedad; "Finalizar ruta" con km reales.
- [ ] **Step 2:** Verificar a 375px: el chofer entrega un pedido → el cliente lo ve `entregado` y se crea la factura. Commit `feat: driver app`.

### Task 11: Flota y telemetría (maqueta)

**Files:**
- Create: `/flota`, `src/components/maps/FleetMap.tsx`

- [ ] **Step 1:** Tarjetas por camión (estado, km, ralentí y frenadas de los últimos 30 días desde `telemetry_events`), alertas de `maintenance_alerts` con botón "Marcar resuelta", mapa con posiciones simuladas que se mueven en bucle sobre las rutas del día, aviso "Datos de telemetría simulados".
- [ ] **Step 2:** Verificar en navegador. Commit `feat: fleet telemetry mock`.

### Task 12: BI y Portal de proveedores

**Files:**
- Create: `supabase/migrations/0004_analytics.sql`, `src/lib/kpi.ts`, `/bi`, `/proveedor`, `src/components/charts/*`, `src/lib/csv.ts`
- Test: `src/lib/kpi.test.ts`, `src/lib/csv.test.ts`

**Interfaces:**
- Produces (SQL, esquema `analytics`, vistas materializadas + RPCs `security definer` con chequeo de rol): `kpi_monthly(p_from date, p_to date)` → `{month, otif, cost_per_bulto, orders, digital_share}`; `customer_profitability(p_from, p_to)` → `{customer_id, name, revenue, margin, logistic_cost, profit}`; `route_performance(p_from, p_to)`; `seller_performance(p_from, p_to)`; `supplier_report(p_from, p_to)` → solo filas del `auth_supplier_id()`: `{month, product, zone, units, revenue, delivered_pct, stores_reached}` sin identificar comercios; `refresh_analytics()` (admin/dirección).
- `otif(rows: {on_time, in_full}[]): number`, `costPerBulto(routeCost: number, bultos: number): number`, `toCsv(rows: object[]): string` (separador `;`, BOM UTF-8 para Excel).

- [ ] **Step 1: Write failing tests**: `otif` de 4 entregas con 3 OK → 0.75; `costPerBulto(0 bultos)` → 0 sin dividir por cero; `toCsv` escapa `;` y comillas.
- [ ] **Step 2:** Run → FAIL; implementar; → PASS.
- [ ] **Step 3:** Migración analytics; test SQL: proveedor Coca-Cola llamando `supplier_report` solo recibe productos Coca-Cola; proveedor llamando `customer_profitability` → excepción.
- [ ] **Step 4:** `/bi`: filtros de período, KPIs (OTIF, costo por bulto, % digital, pedidos), series mensuales (Recharts), top/bottom rentabilidad por cliente, desempeño por ruta/camión/preventista, exportar CSV; vista según rol (ventas: ventas; logística: operación; cobranzas: cobranza). Leer la skill `dataviz` antes de los gráficos. `/proveedor`: ventas por producto/zona/mes, cumplimiento, comercios alcanzados, CSV.
- [ ] **Step 5:** Verificar con datos sembrados que las tendencias se ven. Commit `feat: BI dashboards and supplier portal`.

### Task 13: Administración

**Files:**
- Create: `/admin/usuarios`, `/admin/catalogo`, `/admin/parametros`, `/admin/auditoria`, `supabase/migrations/0005_admin.sql`

**Interfaces:**
- Produces: `admin_set_role(p_user uuid, p_role app_role)`, `admin_set_active(p_user uuid, p_active bool)`; creación de usuarios internos vía `admin_create_user(p_email, p_full_name, p_role, p_password)` (security definer, inserta en `auth.users`, solo admin).

- [ ] **Step 1:** Implementar migración y páginas (usuarios con alta/cambio de rol/desactivar; catálogo editable de precio/stock/activo; parámetros `settings`; auditoría filtrable por acción/fecha). Perfil de roles sensibles muestra "Verificación en dos pasos — Próximamente".
- [ ] **Step 2:** Verificar: cambiar un precio aparece en auditoría; dirección ve auditoría pero no `/admin/usuarios`. Commit `feat: platform administration`.

### Task 14: PWA, despliegue y verificación final

**Files:**
- Create: `src/app/manifest.ts`, `README.md` (actualizar con cuentas demo y arquitectura)

- [ ] **Step 1:** `manifest.ts` (name "Lama Logística y Distribución", short_name "Lama", theme `#DA2128`, íconos del isotipo 192/512).
- [ ] **Step 2:** `npm run build && npx vitest run` → todo verde. Push a `main`.
- [ ] **Step 3:** Crear proyecto Vercel conectado a `Castolo05/LAMA` (MCP `create_git_project` o, si la cuenta no tiene la integración de GitHub, pedir a Fausto que la autorice en el dashboard), cargar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (de `get_project_url`/`get_publishable_keys`), configurar Auth Site URL en Supabase con el dominio de Vercel.
- [ ] **Step 4:** Esperar el deploy `READY`; recorrer en la URL publicada el flujo 11.5 completo con el navegador: cliente pide → depósito prepara → logística planifica y confirma → inicia ruta → cliente ve mapa → chofer entrega → BI se actualiza (tras refrescar) → proveedor ve agregados; más las comprobaciones de Review Focus.
- [ ] **Step 5:** `get_advisors` (security y performance) sin errores críticos. Commit y push final.
