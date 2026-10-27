-- Test de la capa de análisis: el proveedor ve solo agregados de sus productos. Éxito = excepción 'ANALYTICS OK'.
begin;
select set_config('request.jwt.claims', json_build_object('sub',(select id from profiles where email='proveedor@demo.lama.com.ar'),'role','authenticated')::text, true);
create temp table coca_products as select name from products where supplier_id = (select id from suppliers where name like 'The Coca-Cola%');
grant select on coca_products to authenticated;
set local role authenticated;
do $$ declare n int; begin
  select count(*) into n from supplier_report(current_date - 180, current_date, null) r where r.product not in (select name from coca_products);
  if n > 0 then raise exception 'FAIL: proveedor ve productos ajenos (%)', n; end if;
  -- aunque pida otro proveedor, recibe solo lo propio
  select count(*) into n from supplier_report(current_date - 180, current_date, (select id from suppliers where name like 'Frío%')) r where r.product not in (select name from coca_products);
  if n > 0 then raise exception 'FAIL: proveedor consulta otro proveedor'; end if;
  begin
    perform * from customer_profitability(current_date - 30, current_date);
    raise exception 'FAIL: proveedor accede a rentabilidad';
  exception when others then
    if sqlerrm <> 'No autorizado' then raise exception '%', sqlerrm; end if;
  end;
  raise exception 'ANALYTICS OK';
end $$;
rollback;
