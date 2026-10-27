# Lama Conecta — Documento de diseño

Fecha: 2026-10-27 · Autor: Fausto Guaita Lara (Grupo Nodo Sur), con Claude
Fuente: `docs/contexto_lama_nodo_sur.md`, sección 11 (con secciones 1–7 como contexto).

## 1. Intención

Construir la plataforma "Lama Conecta" descrita en la sección 11 del contexto como un **producto funcional**, para mostrarlo a **inversores** en una exposición de 20 minutos. Tiene que parecer un producto real y funcionar como tal: los pedidos se guardan, los roles cambian lo que se ve, los tableros calculan a partir de datos reales en la base y los permisos se aplican en el servidor.

El guion de la presentación lo arma Fausto. Este documento cubre solo el producto.

- **Título visible del sitio:** "Lama Logística y Distribución". "Lama Conecta" es solo el nombre interno del proyecto (repositorio, documentación).
- **Idioma:** español rioplatense, en toda la interfaz.

## 2. Objetivos, no-objetivos y anti-objetivos

**Objetivos**
- Una sola aplicación web responsive e instalable (PWA con manifest e íconos), donde cada rol ve solo lo suyo según la matriz 11.3.
- Los módulos A–E de la sección 11.4: Portal de clientes, Preventa móvil, Operaciones y flota, Datos y BI con Portal de proveedores, y Administración.
- El flujo de punta a punta de la sección 11.5 tiene que funcionar de verdad: el pedido del cliente o del preventista pasa por depósito, entra en la ruta, el chofer lo confirma y eso actualiza los indicadores.
- Publicado en Vercel, con los datos en Supabase y el código en `https://github.com/Castolo05/LAMA`.

**No-objetivos (quedan fuera)**
- Lama Crédito y Lama Marketplace (sección 9 y 11.12), por decisión de Fausto. No se crea el rol "Productor local".
- GPS y telemetría reales. El seguimiento del camión en el mapa y la telemetría son **maquetas creíbles**: posiciones y eventos simulados o sembrados, no integraciones.
- Integración con sistemas de facturación o stock existentes, envío de emails o WhatsApp, y pagos.
- Funcionamiento sin conexión con sincronización posterior en preventa y chofer. *Mi decisión:* queda fuera porque cuesta mucho y no se luce en una demo; la app se instala, pero necesita conexión.
- Verificación en dos pasos. *Mi decisión:* se muestra como "próximamente" en el perfil de los roles sensibles, pero no se implementa.

**Anti-objetivos (sería un fracaso aunque funcione)**
- Que se vea como una plantilla genérica de panel de administración, o que no respete la marca.
- Que algo se rompa o quede vacío en vivo: tableros sin datos, errores de permisos, pantallas en blanco.
- Que los permisos se apliquen solo ocultando botones. Tienen que estar en la base con RLS.

## 3. Restricciones

- **Marca** (`docs/BrandingLama.jpeg`, `docs/Logotipo.png`):
  - Colores: Rojo LAMA `#DA2128` (botones de acción y destacados), Negro Ónice `#1A1A1A` (títulos y menús), Gris Acero `#7A7A7A` (texto secundario), Gris Nube `#F4F5F7` (fondos alternativos), Blanco `#FFFFFF` (fondo y tarjetas).
  - Tipografía: Montserrat para títulos, con itálica bold para los destacados "enérgicos"; Inter para el texto.
  - Botones: rojo sólido, rojo con borde y negro con borde. El campo de búsqueda tiene un botón negro con lupa.
  - El isotipo "L" roja se usa como favicon e ícono de la app. Estilo fotográfico realista, con camiones.
- **Stack** (*mi decisión*): Next.js (App Router, TypeScript), Tailwind CSS, `@supabase/ssr`, Recharts para gráficos y Leaflet con OpenStreetMap para mapas (sin claves de API).
- **Infraestructura:** Supabase con un proyecto nuevo "lama" en `sa-east-1` y plan gratuito, en la organización de Fausto. Vercel en la cuenta personal, conectado al repositorio de GitHub.
- **Datos:** todos ficticios pero verosímiles, ubicados en Tandil y alrededores.

## 4. Lo que decidió Fausto

- La audiencia son inversores; tiene que ser lo más funcional posible.
- Título del sitio: "Lama Logística y Distribución".
- Sin módulos de cambio de modelo de negocio (Crédito, Marketplace).
- Las funciones complejas, como el seguimiento del camión en el mapa, pueden ser maqueta.
- Supabase con un proyecto nuevo, Vercel, y el código en GitHub (`Castolo05/LAMA`).

## 5. Diseño del producto

### 5.1 Sitio público
- **Inicio** (`/`): página institucional de Lama con el logo, una propuesta de valor, las líneas de producto (Coca-Cola, secos, frescos, cadena de frío), la zona de cobertura, los datos de contacto reales del contexto y los botones **Ingresar** y **Registrar mi comercio**.
- **Registro de comercio:** el formulario crea un usuario con rol `cliente` y un comercio en estado `pendiente`. Hasta que Ventas lo apruebe, el usuario ve una pantalla de "en revisión".
- **Ingreso:** email y contraseña con Supabase Auth. Debajo hay un panel **"Cuentas de demostración"** con un botón por rol que inicia sesión directamente. Mientras sea una demo, está bien que cualquiera pueda entrar con cualquier rol desde ahí (decisión de Fausto). Las credenciales de demo viven en el script de carga (seed) y en el README, no en el chat.

### 5.2 Roles
Son los de la sección 11.3 más el **preventista**, que la sección 11.4.B necesita:
`admin`, `direccion`, `ventas`, `preventista`, `logistica`, `deposito`, `chofer`, `cobranzas`, `cliente`, `proveedor`.

- Cada usuario tiene un registro en `profiles` con su rol y su vínculo: el comercio (cliente), el camión o chofer (chofer) o el proveedor (proveedor).
- *Mi decisión:* el "cliente titular" puede invitar empleados del comercio, que comparten el mismo comercio con un permiso marcado como titular o empleado.
- Navegación: barra lateral en escritorio y barra inferior en celular. Solo aparecen los módulos que permite la matriz 11.3.

### 5.3 Módulos

**A. Portal de clientes** (rol cliente)
- Catálogo con buscador, filtros por línea, marca y "reducido en azúcar / sin sellos", precio del día y disponibilidad.
- Carrito, confirmación con fecha de entrega (horario de corte: los pedidos antes de las 18 h salen al día hábil siguiente), "repetir último pedido" y sugerencias de reposición según lo que compra seguido y hace tiempo no pide.
- Mis pedidos, con la línea de tiempo de estados: recibido → en preparación → en reparto → entregado, o con novedad.
- **Seguimiento (maqueta):** en un pedido "en reparto" se ve un mapa de Tandil con un camión que avanza sobre el recorrido de la ruta y la hora estimada de llegada al local. Es una animación interpolada entre las paradas reales de la ruta, sin GPS.
- Reclamos y contacto: un ticket vinculado al pedido (rotura, faltante, demora u otro) con hilo de mensajes que Ventas responde, más botones de llamar o WhatsApp al teléfono de Lama.
- Estado de cuenta: facturas, pagos y saldo.
- Usuarios de mi comercio (solo el titular).

**B. Preventa móvil** (rol preventista)
- "Mis clientes" (solo los que tiene asignados), con la ficha de cada uno: historial y último pedido.
- Toma de pedido en el local con el mismo catálogo y carrito. El pedido queda con `canal = preventa`.
- Pensada primero para el celular.

**C. Operaciones y flota**
- **Depósito:** cola de pedidos a preparar, separada en secos, frescos y frío. Se marca cada pedido como preparado o con faltante por ítem. El faltante ajusta el pedido y avisa al cliente con una novedad. El stock se descuenta al preparar.
- **Planificador de rutas** (logística), funcional con una heurística. Para una fecha toma los pedidos preparados y:
  1. Separa la carga que necesita frío y la asigna solo a camiones refrigerados.
  2. Llena cada camión según su capacidad de peso y volumen.
  3. Ordena las paradas por vecino más cercano desde el depósito (Figueroa 651), poniendo primero las del centro de Tandil por su ventana de descarga (antes de las 10 h).
  4. Calcula los kilómetros (distancia en línea recta × 1,3) y la hora estimada de cada parada.
  5. **Agrupamiento suburbano:** los pedidos de las localidades satélite (Gardey, María Ignacia/Vela, Barker, De la Canal, Azucena, Fulton) se consolidan en un viaje solo si superan un umbral de carga. Si no lo superan, se proponen para la próxima salida con el ahorro estimado.

  El resultado se ve en mapa y en lista. Logística puede reasignar camión o chofer y reordenar antes de confirmar. Al confirmar se crean las rutas y los pedidos pasan a "en reparto" cuando la ruta sale.
- **App del chofer:** su hoja de ruta del día ordenada, con botón "navegar" que abre Google Maps con la dirección. Por parada: confirmar la entrega (registra la hora), cargar faltantes o roturas por ítem y cargar envases retornables recolectados. Al cerrar la ruta queda registrado el kilometraje.
- **Flota y telemetría** (maqueta con datos sembrados): estado de cada camión, kilómetros, ralentí, frenadas bruscas, alertas de mantenimiento predictivo (por ejemplo "Camión 04: patrón de frenado anómalo, revisar frenos en 7 días") y un mapa con la posición simulada de la flota.

**D. Datos y BI**
- **Tableros internos** (dirección, y una vista parcial para ventas, logística y cobranzas según 11.3):
  - OTIF: entregado a tiempo y completo, sobre los entregados.
  - Costo por bulto: costo de las rutas sobre los bultos entregados. El costo de ruta es kilómetros × costo por km más un costo fijo por chofer y jornada, con parámetros configurables.
  - Rentabilidad por cliente: margen por producto (precio − costo) menos el costo logístico asignado por bulto.
  - Desempeño por ruta, camión y preventista.
  - Porcentaje de pedidos por canal (portal / preventa / teléfono), que muestra la adopción digital.
  - Filtro por período y exportación a CSV.
- **Portal de proveedores** (rol proveedor): solo datos **agregados** de sus propios productos: ventas por producto, zona y mes, cumplimiento de entregas y trazabilidad (cantidad de comercios alcanzados, sin nombres). Se sirve con funciones de la base que devuelven solo agregados; el proveedor no tiene acceso directo a las tablas de pedidos.
- *Mi decisión:* el "Data Warehouse" se implementa como **vistas y vistas materializadas** en un esquema `analytics` dentro de la misma base, con un botón de "refrescar". En la presentación se explica como la capa de análisis, aunque no es un servicio aparte.

**E. Administración** (admin)
- Usuarios: alta, cambio de rol y desactivación.
- Catálogo y precios: editar precio, stock y productos.
- Parámetros: costo por km, horario de corte, umbral suburbano.
- Auditoría: lista filtrable de eventos (altas y bajas de usuarios, cambios de precio y de rol, anulación de pedidos, aprobación de clientes), registrados con *triggers* en la base.

**Ventas y atención** (rol ventas)
- Aprobación de comercios pendientes.
- Bandeja de reclamos con respuesta.
- Carga de pedidos telefónicos (`canal = telefono`) a nombre de un cliente.
- Gestión de precios y promociones (porcentaje de descuento por producto con vigencia).

**Cobranzas:** estado de cuenta de todos los clientes, registro de pagos, vencidos y antigüedad de deuda.

### 5.4 Seguridad
- RLS activado en todas las tablas. Las políticas leen el rol y los vínculos desde `profiles` a través de funciones `security definer` (`auth_role()`, `auth_customer_id()`, etc.), para no caer en recursión.
- Restricciones por pertenencia según 11.3:
  - El cliente ve solo su comercio, sus pedidos, su cuenta y sus reclamos.
  - El preventista ve solo sus clientes.
  - El chofer ve solo sus rutas y paradas.
  - El proveedor no lee tablas, solo funciones que devuelven agregados.
- Los cambios de estado sensibles (confirmar pedido, preparar, entregar, generar rutas) pasan por funciones RPC de Postgres o *server actions* que validan el rol. El cliente no puede, por ejemplo, poner su pedido como "entregado".
- La clave privada `service_role` solo se usa en el script de carga de datos, nunca en el navegador.

### 5.5 Modelo de datos (entidades principales)
- `profiles`: rol, nombre, `customer_id`, `driver_id`, `supplier_id`, `is_owner`.
- `customers`: comercio: nombre, tipo (almacén, kiosco, gastronómico, supermercado), dirección, latitud y longitud, zona (centro, barrios o localidad satélite), estado (pendiente, aprobado o rechazado), preventista asignado, plazo de pago.
- `suppliers`, `categories`, `products`: SKU, nombre, marca, línea, proveedor, requiere frío, precio, costo, stock, peso, volumen, unidad o bulto, reducido en azúcar.
- `promotions`.
- `orders`: cliente, quién lo creó, canal, estado, fecha de entrega, total, ruta, entregado a tiempo, entregado completo. `order_items`: cantidad pedida, preparada y entregada.
- `trucks`: patente, capacidad en kg y m³, refrigerado. `drivers`.
- `routes`: fecha, camión, chofer, estado, km planificados y reales. `route_stops`: orden, hora estimada, hora de entrega, estado.
- `returnables`: envases por parada.
- `tickets` y `ticket_messages`.
- `invoices` y `payments`, más la vista `account_statement`.
- `telemetry_events` y `maintenance_alerts`.
- `settings`, `audit_log`.

### 5.6 Datos de ejemplo (seed)
- Unos 45 comercios en Tandil, con direcciones y coordenadas plausibles en el centro y los barrios, y unos 8 en localidades satélite. 3 pendientes de aprobación.
- Unos 80 productos de las 4 líneas, con marcas reales del catálogo: Coca-Cola, Sprite, Fanta, Cepita, Bonaqua, Kin, Monster, más marcas genéricas o regionales para secos, frescos y congelados.
- Proveedores: The Coca-Cola Company (FEMSA), un proveedor de lácteos, uno de fiambres y quesos, y uno de congelados.
- 6 camiones (3 refrigerados), 6 choferes y 3 preventistas.
- **Unos 6 meses de historia:** pedidos, rutas y entregas con una tendencia creciente en el canal digital, OTIF de alrededor del 88 % que mejora, novedades, facturas y pagos, para que los tableros cuenten una historia.
- Para "hoy": pedidos en todos los estados, una ruta en curso para que funcione la maqueta del mapa y pedidos preparados para que el planificador tenga con qué trabajar.
- Una cuenta de demo por rol, más un segundo cliente para mostrar que no ve los pedidos del primero.
- El seed se ejecuta una sola vez al montar el proyecto. No hace falta un comando de reseteo de la demo (decisión de Fausto).

## 6. Lo que queda a criterio de quien construye
- La estructura de carpetas, los componentes y la librería de íconos (Lucide).
- El diseño visual exacto de cada pantalla, dentro de la marca y siguiendo las skills de diseño frontend.
- Los nombres de marcas genéricas y los precios de ejemplo.
- Los detalles de la heurística de ruteo, siempre que respete las restricciones de 5.3.C.

## 7. Entrega
- Repositorio `Castolo05/LAMA`: la aplicación en la raíz, con el contexto y el branding movidos a `docs/` (*mi decisión*).
- Migraciones SQL en `supabase/migrations/`, aplicadas al proyecto Supabase "lama".
- Proyecto en Vercel conectado al repositorio, con las variables de Supabase configuradas.
- Verificación final: recorrer el flujo de 11.5 completo en la URL publicada, con cada rol.
