# Lama Conecta

Plataforma web de **Lama Logística y Distribución S.R.L.** (Tandil): portal de clientes, preventa, depósito, ruteo, app del chofer, flota, BI, portal de proveedores y administración — en una sola aplicación con accesos por rol.

Proyecto de Grupo Nodo Sur (Transformación Digital). Diseño en `docs/superpowers/specs/`, plan en `docs/superpowers/plans/`.

## Stack
Next.js 15 (App Router) · Supabase (Postgres + Auth + RLS) · Tailwind CSS · Recharts · Leaflet/OpenStreetMap · Vercel.

## Desarrollo
```bash
cp .env.example .env.local   # completar con URL y anon key de Supabase
npm install
npm run dev
npm test
```
