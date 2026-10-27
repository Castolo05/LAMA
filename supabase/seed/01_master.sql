-- Seed 1/3 — datos maestros, flota, usuarios y comercios. Ejecutar una sola vez.
do $$
declare
  pw text := 'DemoLama2026!';
  s_coca uuid; s_lac uuid; s_chac uuid; s_frio uuid; s_secos uuid;
  c record; uid uuid; t record; i int;
begin
  perform setseed(0.42);

  insert into suppliers (name) values ('The Coca-Cola Company (FEMSA)') returning id into s_coca;
  insert into suppliers (name) values ('Lácteos Serranos S.A.') returning id into s_lac;
  insert into suppliers (name) values ('Chacinados y Quesos de la Sierra') returning id into s_chac;
  insert into suppliers (name) values ('Frío Sur Congelados') returning id into s_frio;
  insert into suppliers (name) values ('Alimentos Don Tandil') returning id into s_secos;

  insert into categories (name, line) values
    ('Gaseosas','coca_cola'),('Jugos','coca_cola'),('Aguas','coca_cola'),('Energizantes e isotónicas','coca_cola'),
    ('Pastas y harinas','secos'),('Almacén','secos'),('Conservas','secos'),('Infusiones','secos'),('Galletitas','secos'),
    ('Lácteos','frescos'),('Quesos','frescos'),('Fiambres','frescos'),
    ('Carnes y pollo','congelados'),('Papas y vegetales','congelados'),('Pescados','congelados'),('Helados','congelados');

  insert into products (sku, name, brand, category_id, supplier_id, needs_cold, price, cost, stock, weight_kg, volume_m3, unit, low_sugar)
  select v.sku, v.name, v.brand, (select id from categories where name = v.cat),
         case v.sup when 'coca' then s_coca when 'lac' then s_lac when 'chac' then s_chac when 'frio' then s_frio else s_secos end,
         v.cold, v.price, round(v.price * v.costpct, 2), v.stock, v.kg, v.m3, v.unit, v.low
  from (values
    ('CC-0225','Coca-Cola 2,25 L','Coca-Cola','Gaseosas','coca',false,21900,0.78,420,14.2,0.024,'Pack x 6',false),
    ('CC-0150','Coca-Cola 1,5 L','Coca-Cola','Gaseosas','coca',false,16500,0.78,380,9.6,0.017,'Pack x 6',false),
    ('CC-0050','Coca-Cola 500 ml','Coca-Cola','Gaseosas','coca',false,17800,0.77,300,6.6,0.011,'Pack x 12',false),
    ('CC-L354','Coca-Cola lata 354 ml','Coca-Cola','Gaseosas','coca',false,8900,0.77,260,2.3,0.004,'Pack x 6',false),
    ('CZ-0225','Coca-Cola Sin Azúcar 2,25 L','Coca-Cola','Gaseosas','coca',false,21900,0.78,300,14.2,0.024,'Pack x 6',true),
    ('CZ-0050','Coca-Cola Sin Azúcar 500 ml','Coca-Cola','Gaseosas','coca',false,17800,0.77,220,6.6,0.011,'Pack x 12',true),
    ('SP-0225','Sprite 2,25 L','Sprite','Gaseosas','coca',false,19400,0.78,260,14.2,0.024,'Pack x 6',false),
    ('SZ-0150','Sprite Zero 1,5 L','Sprite','Gaseosas','coca',false,14600,0.78,180,9.6,0.017,'Pack x 6',true),
    ('FN-0225','Fanta Naranja 2,25 L','Fanta','Gaseosas','coca',false,19400,0.78,250,14.2,0.024,'Pack x 6',false),
    ('FZ-0150','Fanta Naranja Zero 1,5 L','Fanta','Gaseosas','coca',false,14600,0.78,160,9.6,0.017,'Pack x 6',true),
    ('SW-0150','Schweppes Pomelo 1,5 L','Schweppes','Gaseosas','coca',false,15800,0.78,150,9.6,0.017,'Pack x 6',false),
    ('CE-NA01','Cepita Naranja 1 L','Cepita','Jugos','coca',false,18400,0.76,200,8.6,0.012,'Pack x 8',false),
    ('CE-DU01','Cepita Durazno 1 L','Cepita','Jugos','coca',false,18400,0.76,170,8.6,0.012,'Pack x 8',false),
    ('CE-NS01','Cepita Naranja Sin Azúcar 1 L','Cepita','Jugos','coca',false,18900,0.76,120,8.6,0.012,'Pack x 8',true),
    ('BQ-SG15','Bonaqua sin gas 1,5 L','Bonaqua','Aguas','coca',false,9800,0.74,320,9.4,0.017,'Pack x 6',true),
    ('BQ-CG15','Bonaqua con gas 1,5 L','Bonaqua','Aguas','coca',false,9800,0.74,220,9.4,0.017,'Pack x 6',true),
    ('KN-SG20','Kin sin gas 2 L','Kin','Aguas','coca',false,10900,0.74,240,12.4,0.022,'Pack x 6',true),
    ('AQ-PO15','Aquarius Pomelo 1,5 L','Aquarius','Aguas','coca',false,14200,0.76,160,9.6,0.017,'Pack x 6',false),
    ('MN-EN47','Monster Energy 473 ml','Monster','Energizantes e isotónicas','coca',false,22800,0.75,140,3.1,0.005,'Pack x 6',false),
    ('MN-UL47','Monster Ultra 473 ml','Monster','Energizantes e isotónicas','coca',false,22800,0.75,110,3.1,0.005,'Pack x 6',true),
    ('PW-MB50','Powerade Mountain Blast 500 ml','Powerade','Energizantes e isotónicas','coca',false,11400,0.75,130,3.3,0.006,'Pack x 6',false),
    ('ST-FS50','Fideos spaghetti 500 g','Don Tandil','Pastas y harinas','secos',false,16800,0.70,200,10.4,0.020,'Caja x 20',false),
    ('ST-FT50','Fideos tirabuzón 500 g','Don Tandil','Pastas y harinas','secos',false,16800,0.70,180,10.4,0.022,'Caja x 20',false),
    ('ST-H000','Harina 000 1 kg','La Sierra','Pastas y harinas','secos',false,9200,0.72,220,10.2,0.014,'Bolsón x 10',false),
    ('ST-H400','Harina 0000 1 kg','La Sierra','Pastas y harinas','secos',false,9900,0.72,200,10.2,0.014,'Bolsón x 10',false),
    ('ST-ARLF','Arroz largo fino 1 kg','Campo Serrano','Almacén','secos',false,14500,0.71,190,10.2,0.014,'Bolsón x 10',false),
    ('ST-ACG1','Aceite de girasol 1,5 L','Campo Serrano','Almacén','secos',false,42600,0.74,150,17.6,0.028,'Caja x 12',false),
    ('ST-AZ01','Azúcar 1 kg','La Sierra','Almacén','secos',false,11800,0.73,210,10.2,0.013,'Bolsón x 10',false),
    ('ST-YM01','Yerba mate 1 kg','Campo Serrano','Infusiones','secos',false,38900,0.72,160,10.3,0.020,'Caja x 10',false),
    ('ST-TE20','Té en saquitos x 25','Don Tandil','Infusiones','secos',false,13600,0.70,120,1.2,0.008,'Caja x 20',false),
    ('ST-CM25','Café molido 250 g','Don Tandil','Infusiones','secos',false,31200,0.72,90,3.2,0.007,'Caja x 12',false),
    ('ST-PT52','Puré de tomate 520 g','Campo Serrano','Conservas','secos',false,12400,0.70,240,6.8,0.009,'Caja x 12',false),
    ('ST-AR35','Arvejas en lata 350 g','Campo Serrano','Conservas','secos',false,19800,0.70,140,9.4,0.010,'Caja x 24',false),
    ('ST-AT17','Atún en lata 170 g','Don Tandil','Conservas','secos',false,52800,0.73,110,4.6,0.006,'Caja x 24',false),
    ('ST-GA30','Galletitas de agua 300 g','La Sierra','Galletitas','secos',false,24600,0.70,170,9.4,0.030,'Caja x 30',false),
    ('ST-GD15','Galletitas dulces vainilla 150 g','La Sierra','Galletitas','secos',false,17900,0.70,160,3.8,0.018,'Caja x 24',false),
    ('ST-MD45','Mermelada de durazno 450 g','Don Tandil','Almacén','secos',false,21600,0.70,90,6.5,0.008,'Caja x 12',false),
    ('ST-PO50','Polenta instantánea 500 g','La Sierra','Pastas y harinas','secos',false,13900,0.70,130,10.4,0.016,'Caja x 20',false),
    ('LS-LE01','Leche entera sachet 1 L','Lácteos Serranos','Lácteos','lac',true,14200,0.78,260,12.6,0.014,'Cajón x 12',false),
    ('LS-LD01','Leche descremada sachet 1 L','Lácteos Serranos','Lácteos','lac',true,14600,0.78,180,12.6,0.014,'Cajón x 12',true),
    ('LS-YB01','Yogur bebible frutilla 1 L','Lácteos Serranos','Lácteos','lac',true,25800,0.74,120,12.8,0.015,'Pack x 12',false),
    ('LS-YS01','Yogur descremado sin azúcar 1 L','Lácteos Serranos','Lácteos','lac',true,26900,0.74,90,12.8,0.015,'Pack x 12',true),
    ('LS-MA20','Manteca 200 g','Lácteos Serranos','Lácteos','lac',true,27400,0.75,100,2.2,0.004,'Caja x 10',false),
    ('LS-CR20','Crema de leche 200 ml','Lácteos Serranos','Lácteos','lac',true,23500,0.75,95,2.6,0.004,'Caja x 12',false),
    ('LS-DL40','Dulce de leche 400 g','Lácteos Serranos','Lácteos','lac',true,30800,0.74,110,5.1,0.006,'Caja x 12',false),
    ('QS-CRKG','Queso cremoso (horma ~4 kg)','Quesería Tandil','Quesos','chac',true,38500,0.72,80,4.0,0.006,'Horma',false),
    ('QS-TYKG','Queso tybo barra (~3,5 kg)','Quesería Tandil','Quesos','chac',true,36900,0.72,70,3.5,0.005,'Barra',false),
    ('QS-RG01','Queso reggianito (~1 kg)','Quesería Tandil','Quesos','chac',true,21400,0.70,60,1.0,0.002,'Unidad',false),
    ('QS-RT50','Ricota 500 g','Quesería Tandil','Quesos','chac',true,28800,0.72,60,6.1,0.008,'Caja x 12',false),
    ('CH-SATA','Salame tandilero (~1 kg)','Chacinados de la Sierra','Fiambres','chac',true,24900,0.68,90,1.0,0.002,'Unidad',false),
    ('CH-JC35','Jamón cocido (pieza ~3,5 kg)','Chacinados de la Sierra','Fiambres','chac',true,49800,0.72,60,3.5,0.005,'Pieza',false),
    ('CH-PA35','Paleta cocida (pieza ~3,5 kg)','Chacinados de la Sierra','Fiambres','chac',true,32600,0.72,60,3.5,0.005,'Pieza',false),
    ('CH-MO40','Mortadela (pieza ~4 kg)','Chacinados de la Sierra','Fiambres','chac',true,22800,0.70,50,4.0,0.005,'Pieza',false),
    ('CH-SA12','Salchichas x 12','Chacinados de la Sierra','Fiambres','chac',true,34400,0.72,80,7.4,0.010,'Caja x 12',false),
    ('FS-HA40','Hamburguesas de carne x 4','Frío Sur','Carnes y pollo','frio',true,46800,0.73,90,8.2,0.016,'Caja x 20',false),
    ('FS-MP24','Medallones de pollo x 4','Frío Sur','Carnes y pollo','frio',true,39600,0.73,80,6.4,0.014,'Caja x 24',false),
    ('FS-NU01','Nuggets de pollo 1 kg','Frío Sur','Carnes y pollo','frio',true,41200,0.73,70,6.2,0.014,'Caja x 6',false),
    ('FS-PB25','Papas bastón 2,5 kg','Frío Sur','Papas y vegetales','frio',true,38400,0.72,90,10.2,0.026,'Caja x 4',false),
    ('FS-VM01','Vegetales mixtos 1 kg','Frío Sur','Papas y vegetales','frio',true,29800,0.72,60,10.2,0.022,'Caja x 10',false),
    ('FS-ES50','Espinaca congelada 500 g','Frío Sur','Papas y vegetales','frio',true,24600,0.72,50,5.2,0.012,'Caja x 10',false),
    ('FS-MM01','Filet de merluza 1 kg','Frío Sur','Pescados','frio',true,72900,0.74,50,10.4,0.018,'Caja x 10',false),
    ('FS-PZ10','Prepizzas x 2','Frío Sur','Papas y vegetales','frio',true,27600,0.70,70,7.0,0.030,'Caja x 10',false),
    ('FS-HE15','Helado crema americana 1,5 L','Frío Sur','Helados','frio',true,33600,0.68,60,5.4,0.012,'Caja x 6',false),
    ('FS-HP24','Helado palito de agua','Frío Sur','Helados','frio',true,21600,0.66,80,1.8,0.010,'Caja x 24',true)
  ) as v(sku,name,brand,cat,sup,cold,price,costpct,stock,kg,m3,unit,low);

  insert into promotions (product_id, pct, starts_on, ends_on)
  select id, v.pct, current_date - 5, current_date + 20 from products
  join (values ('CZ-0225',10),('CE-NS01',12),('FS-PB25',8),('ST-YM01',7),('LS-YS01',10)) as v(sku,pct) using (sku);

  -- Flota
  insert into trucks (plate, name, capacity_kg, capacity_m3, refrigerated, odometer_km) values
    ('AD 214 KF','Camión 01 · Mercedes Atego',6500,34,true,184320),
    ('AE 871 PL','Camión 02 · Iveco Tector',6000,32,true,152110),
    ('AC 532 JD','Camión 03 · Mercedes Accelo',4200,24,true,231870),
    ('AF 104 QR','Camión 04 · Ford Cargo',6500,36,false,198450),
    ('AB 966 TM','Camión 05 · VW Delivery',4000,22,false,264900),
    ('AG 327 NS','Utilitario 06 · Sprinter',1500,11,false,97640);
  insert into drivers (full_name, license, phone, truck_id)
  select v.n, v.l, v.p, (select id from trucks where plate = v.plate) from (values
    ('Carlos Medina','C2-31877455','249 461-2201','AD 214 KF'),
    ('Javier Correa','C2-29544103','249 458-7710','AE 871 PL'),
    ('Diego Aranda','C1-33410982','249 463-0098','AC 532 JD'),
    ('Raúl Ferreyra','C2-27660114','249 459-3345','AF 104 QR'),
    ('Nicolás Paz','C1-35201776','249 460-8812','AB 966 TM'),
    ('Emiliano Ruiz','B2-38119023','249 462-5530','AG 327 NS')) v(n,l,p,plate);

  -- Usuarios internos
  for c in select * from (values
    ('admin@demo.lama.com.ar','Soporte TI','admin'),
    ('direccion@demo.lama.com.ar','Ricardo Lama','direccion'),
    ('ventas@demo.lama.com.ar','Laura Pereyra','ventas'),
    ('logistica@demo.lama.com.ar','Sergio Ramos','logistica'),
    ('deposito@demo.lama.com.ar','Hugo Benítez','logistica'),
    ('cobranzas@demo.lama.com.ar','Gabriela Sosa','ventas'),
    ('chofer@demo.lama.com.ar','Carlos Medina','chofer'),
    ('proveedor@demo.lama.com.ar','Coca-Cola FEMSA (Mariana Vidal)','proveedor')) v(email, name, role)
  loop
    uid := create_auth_user(c.email, pw, c.name);
    update profiles set role = c.role::app_role, full_name = c.name,
      driver_id = case when c.role = 'chofer' then (select id from drivers where full_name = 'Carlos Medina') end,
      supplier_id = case when c.role = 'proveedor' then s_coca end
    where id = uid;
  end loop;

  -- Comercios (zona centro, barrios y localidades satélite)
  for c in select row_number() over () as n, * from (values
    ('Almacén Don Tito','almacen','centro','Pinto 742',-37.3262,-59.1355),
    ('Kiosco La Esquina','kiosco','centro','9 de Julio 598',-37.3239,-59.1376),
    ('Autoservicio El Mirador','supermercado','barrios','Av. Santamarina 1450',-37.3112,-59.1427),
    ('Parrilla El Molino','gastronomico','centro','Rodríguez 455',-37.3247,-59.1318),
    ('Almacén Los Hermanos','almacen','barrios','Quintana 1210',-37.3368,-59.1462),
    ('Maxikiosco Avenida','kiosco','centro','Av. España 380',-37.3218,-59.1291),
    ('Pizzería La Vieja Estación','gastronomico','barrios','Av. Machado 820',-37.3105,-59.1288),
    ('Despensa Doña Rosa','almacen','barrios','Montiel 1580',-37.3431,-59.1270),
    ('Supermercado Serrano','supermercado','barrios','Av. Avellaneda 1890',-37.3382,-59.1181),
    ('Kiosco El Paso','kiosco','centro','Belgrano 615',-37.3195,-59.1348),
    ('Almacén La Movediza','almacen','barrios','Av. Buzón 2100',-37.2942,-59.1460),
    ('Café Uniceba','gastronomico','centro','Yrigoyen 610',-37.3226,-59.1395),
    ('Autoservicio Villa Italia','supermercado','barrios','Garibaldi 1320',-37.3335,-59.1529),
    ('Kiosco Facultad','kiosco','barrios','Paraje Arroyo Seco s/n',-37.3268,-59.0815),
    ('Almacén Doña Elsa','almacen','barrios','Fuerte Independencia 1880',-37.3459,-59.1386),
    ('Rotisería Lo de Pocha','gastronomico','barrios','Alem 1190',-37.3303,-59.1258),
    ('Despensa El Tala','almacen','barrios','Av. Marconi 1650',-37.3060,-59.1567),
    ('Maxikiosco Terminal','kiosco','barrios','Av. Buzón 650',-37.3121,-59.1365),
    ('Almacén San Cayetano','almacen','barrios','Av. Colón 1820',-37.3370,-59.1335),
    ('Bar La Cueva','gastronomico','centro','Chacabuco 270',-37.3229,-59.1300),
    ('Autoservicio Lourdes','supermercado','barrios','Larrea 1450',-37.3018,-59.1324),
    ('Kiosco Plaza','kiosco','centro','Mitre 520',-37.3211,-59.1338),
    ('Almacén El Ciclista','almacen','barrios','Saavedra 980',-37.3280,-59.1505),
    ('Restaurante Sierra Alta','gastronomico','barrios','Av. Don Bosco 1250',-37.3402,-59.1452),
    ('Despensa Las Acacias','almacen','barrios','Brasil 860',-37.3166,-59.1197),
    ('Almacén Tres Esquinas','almacen','barrios','Sarmiento 1550',-37.3341,-59.1222),
    ('Kiosco Hospital','kiosco','barrios','Paz 1380',-37.3305,-59.1445),
    ('Heladería Ciudad','gastronomico','centro','San Martín 690',-37.3254,-59.1338),
    ('Autoservicio Palermo','supermercado','barrios','Av. Avellaneda 650',-37.3247,-59.1202),
    ('Almacén Cerro Leones','almacen','barrios','Ruta 226 km 152',-37.2898,-59.1871),
    ('Kiosco Lago','kiosco','barrios','Av. Del Valle 1100',-37.3346,-59.1588),
    ('Almacén Doña Chela','almacen','barrios','Las Heras 1020',-37.3164,-59.1449),
    ('Cervecería La Fábrica','gastronomico','barrios','Av. Rivadavia 300',-37.3150,-59.1310),
    ('Despensa El Progreso','almacen','barrios','Necochea 1340',-37.3296,-59.1178),
    ('Kiosco Estación','kiosco','barrios','Av. Machado 400',-37.3085,-59.1341),
    ('Almacén Los Pinos','almacen','barrios','Av. Santamarina 2800',-37.3015,-59.1505),
    ('Comedor Escolar N° 12','gastronomico','barrios','Bolívar 1440',-37.3360,-59.1290),
    ('Autoservicio Gardey','supermercado','Gardey','Av. San Martín 210, Gardey',-37.2835,-59.3655),
    ('Almacén Ramos Generales','almacen','Gardey','Belgrano 95, Gardey',-37.2822,-59.3681),
    ('Almacén María Ignacia','almacen','María Ignacia','Av. Rivadavia 140, Vela',-37.4008,-59.5068),
    ('Kiosco Vela','kiosco','María Ignacia','San Martín 55, Vela',-37.4019,-59.5080),
    ('Almacén Barker','almacen','Barker','Calle 6 n° 312, Barker',-37.6380,-59.3884),
    ('Autoservicio Villa Cacique','supermercado','Barker','Av. Fortabat 240, Barker',-37.6400,-59.3860),
    ('Almacén De la Canal','almacen','De la Canal','Ruta 74 s/n, De la Canal',-37.1335,-59.1005),
    ('Almacén Azucena','almacen','Azucena','Calle Principal 20, Azucena',-37.5005,-59.3330),
    ('Almacén Fulton','almacen','Fulton','Av. Central 77, Fulton',-37.4170,-58.8003),
    ('Despensa La Cumbre','almacen','barrios','Uriburu 1680',-37.3488,-59.1312),
    ('Kiosco Universitario','kiosco','centro','Pinto 399',-37.3221,-59.1359),
    ('Almacén El Fortín','almacen','barrios','Av. Colón 2950',-37.3448,-59.1330),
    ('Autoservicio La Rueda','supermercado','barrios','Av. Espora 1500',-37.3080,-59.1228),
    ('Almacén Nuevo Sol','almacen','barrios','Rauch 1650',-37.3198,-59.1530),
    ('Parador Las Sierras','gastronomico','barrios','Ruta 226 km 160',-37.3495,-59.0905),
    ('Kiosco La Plaza Norte','kiosco','barrios','Gral. Paz 2100',-37.3080,-59.1405)
  ) v(name, kind, zone, address, lat, lng)
  loop
    insert into customers (name, kind, address, lat, lng, zone, is_satellite, status, payment_terms_days, phone, cuit, created_at)
    values (c.name, c.kind::customer_kind, c.address, c.lat, c.lng,
            c.zone,
            c.zone not in ('centro', 'barrios'),
            case when c.n in (51, 52, 53) then 'pendiente' else 'aprobado' end,
            (array[7, 15, 15, 21, 30])[1 + (c.n % 5)],
            '249 4' || lpad((40000 + c.n * 137)::text, 5, '0'),
            '30-' || lpad((71000000 + c.n * 9137)::text, 8, '0') || '-' || (c.n % 9),
            now() - interval '400 days' + (c.n || ' days')::interval);
  end loop;
  update customers set created_at = now() - interval '2 days' where status = 'pendiente';

  -- Cliente demo
  uid := create_auth_user('cliente@demo.lama.com.ar', pw, 'Tito Fernández');
  update profiles set customer_id = (select id from customers where name = 'Almacén Don Tito'), is_owner = true where id = uid;
end $$;
