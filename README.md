# Lama Conecta

Plataforma web de **Lama Logística y Distribución S.R.L.** (Tandil). Una sola aplicación, con accesos por rol, que reúne:

- **Portal de clientes**: catálogo con precios del día, pedidos, repetir último pedido, sugerencias de reposición, seguimiento del camión con hora estimada, reclamos y estado de cuenta.
- **Preventa móvil**: el preventista toma pedidos de su cartera en el local del cliente.
- **Ventas y atención**: aprobación de altas, reclamos, pedidos telefónicos, precios y promociones.
- **Depósito**: preparación por zona (secos, frescos, frío) con registro de faltantes.
- **Logística**: planificador de rutas (cadena de frío, capacidad, ventana del centro, agrupamiento de localidades) y tablero de rutas.
- **Chofer**: hoja de ruta en el celular, confirmación de entregas y envases retornables.
- **Flota**: telemetría y alertas de mantenimiento (simuladas para la demo).
- **Tableros (BI)**: OTIF, costo por bulto, pedidos por canal, rentabilidad por cliente, desempeño por camión y preventista.
- **Portal de proveedores**: informes agregados de sus productos.
- **Administración**: usuarios y roles, catálogo, parámetros y auditoría.

**Sitio publicado:** https://lama-logistica.vercel.app

Proyecto de Grupo Nodo Sur (Transformación Digital). Diseño en `docs/superpowers/specs/`, plan en `docs/superpowers/plans/`, contexto y marca en `docs/`.

## Cuentas de demostración

En `/ingresar` hay un botón por rol. Todas usan la contraseña `DemoLama2026!`:

| Rol | Email |
| --- | --- |
| Cliente (Almacén Don Tito) | cliente@demo.lama.com.ar |
| Cliente 2 (Kiosco La Esquina) | cliente2@demo.lama.com.ar |
| Preventista | preventista@demo.lama.com.ar |
| Ventas y atención | ventas@demo.lama.com.ar |
| Depósito | deposito@demo.lama.com.ar |
| Logística | logistica@demo.lama.com.ar |
| Chofer | chofer@demo.lama.com.ar |
| Cobranzas | cobranzas@demo.lama.com.ar |
| Dirección | direccion@demo.lama.com.ar |
| Proveedor (Coca-Cola FEMSA) | proveedor@demo.lama.com.ar |
| Administrador | admin@demo.lama.com.ar |

Los datos son de ejemplo. Un proceso diario (`pg_cron`, `demo_shift_dates()`) corre las fechas para que siempre haya rutas y pedidos "de hoy".

## Arquitectura

- **Next.js 15** (App Router, server components y server actions), Tailwind CSS, Recharts, Leaflet + OpenStreetMap.
- **Supabase**: Postgres + Auth. RLS en todas las tablas según la matriz de permisos; las transiciones de estado (pedido, preparación, rutas, entrega) son RPCs `security definer` que validan rol y pertenencia. Auditoría por triggers.
- **Vercel** para el despliegue.

```
src/app/            páginas (públicas y (app) por rol)
src/components/     UI, catálogo, carrito, mapas, gráficos
src/lib/            lógica pura con tests (carrito, entregas, ruteo, KPIs, saldos)
supabase/migrations esquema, RLS, RPCs y analítica
supabase/seed       datos de demostración
supabase/tests      tests SQL (RLS, RPCs, analítica)
```

## Desarrollo

```bash
cp .env.example .env.local   # NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
npm test
```

## Fotografías

Imágenes de colecciones abiertas, con su crédito en el pie de la página de inicio (detalle en `docs/photo-credits.json`).
