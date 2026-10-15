function materiales_(db) {
  return db('materiales').rows.map(r=>{
    const m={id:r.id,nombre:String(r.nombre),categoria:String(r.categoria),
      existencia_total:entero_(r.existencia_total,0,r.id+' total'),
      existencia_disponible:entero_(r.existencia_disponible,0,r.id+' disponible'),
      limite_por_solicitud:entero_(r.limite_por_solicitud,1,r.id+' límite'),activo:booleano_(r.activo),_fila:r._fila};
    if(m.existencia_disponible>m.existencia_total) fallar_('Inventario inconsistente en '+m.id+'. Revisa existencias antes de operar.');
    return m;
  });
}
function configuracion_(db) {
  const c={}; db('configuracion').rows.forEach(r=>c[clave_(r.parametro)]=r.valor);
  return {maxDias:entero_(c.max_dias_prestamo,1,'max_dias_prestamo'),maxItems:entero_(c.max_items_por_solicitud,1,'max_items_por_solicitud')};
}
function validarItems_(db,items,requiereStock) {
  if(!Array.isArray(items)||!items.length||items.length>100) fallar_('Selecciona entre 1 y 100 materiales.');
  const mats=materiales_(db), seen=new Set(),config=configuracion_(db); let total=0;
  const resultado=items.map(i=>{
    const id=texto_(i?.material_id,'el material',100),cantidad=entero_(i?.cantidad,1,id);
    if(seen.has(id)) fallar_('Material repetido: '+id); seen.add(id);
    const m=mats.find(m=>m.id===id);
    if(!m||!m.activo) fallar_('El material '+id+' no existe o está inactivo.');
    if(cantidad>m.limite_por_solicitud) fallar_('La cantidad supera el límite de '+m.nombre+'.');
    if(requiereStock && cantidad>m.existencia_disponible) fallar_('No hay suficientes unidades de '+m.nombre+'.');
    total+=cantidad;
    return {material:m,cantidad};
  });
  if(!Number.isSafeInteger(total)||total>config.maxItems) fallar_('La solicitud supera el máximo total de artículos.');
  return resultado;
}
function movimiento_(db,req,material,prestamo,tipo,cantidad,usuario,nota) {
  agregar_(req,db('movimientos'),{id:id_('MOV'),material_id:material,prestamo_id:prestamo,tipo,cantidad,fecha:new Date(),usuario_responsable:usuario,nota});
}
