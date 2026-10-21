function detalles_(db,id) {
  const seen=new Set();
  return db('detalles_prestamos').rows.filter(r=>String(r.prestamo_id)===id).map(r=>{
    const d={...r,material_id:String(r.material_id),cantidad_solicitada:entero_(r.cantidad_solicitada,1,id+' solicitada'),cantidad_entregada:entero_(r.cantidad_entregada,0,id+' entregada'),cantidad_devuelta:entero_(r.cantidad_devuelta,0,id+' devuelta')};
    if(seen.has(d.material_id) || d.cantidad_devuelta>d.cantidad_entregada || d.cantidad_entregada>d.cantidad_solicitada) fallar_('Detalles inconsistentes en '+id+'. Revisa la hoja antes de operar.');
    seen.add(d.material_id); return d;
  });
}
function estado_(p) { return normalizarTextoFormulario_(p.estado); }
function panel_(db,u) {
  const mats=materiales_(db),mt=new Map(mats.map(m=>[m.id,m]));
  const prestamos=db('prestamos').rows.map(p=>{
    const estado=estado_(p);
    if(!['pendiente','aceptado','entregado','parcial','devuelto','rechazado','cancelado'].includes(estado)) fallar_('Estado antiguo o inválido en '+p.id+': '+estado+'. Revisa ese registro, no se modifica automáticamente.');
    return {id:p.id,matricula:String(p.matricula),nombre:String(p.nombre),telefono:String(p.telefono),correo:String(p.correo),estado,motivo:String(p.motivo),
      fecha_solicitud:fechaISO_(p.fecha_solicitud),fecha_limite:fechaISO_(p.fecha_limite),fecha_entrega:fechaISO_(p.fecha_entrega),fecha_devolucion:fechaISO_(p.fecha_devolucion),
      detalles:detalles_(db,p.id).map(d=>({material_id:d.material_id,material:mt.get(d.material_id)?.nombre||d.material_id,cantidad_solicitada:d.cantidad_solicitada,cantidad_entregada:d.cantidad_entregada,cantidad_devuelta:d.cantidad_devuelta}))};
  });
  return {ok:true,version:2,completo:true,materiales:mats.map(({_fila,...m})=>m),prestamos,usuarios:esAdmin_(u)?db('usuarios').rows.filter(esPersonal_).map(usuarioSeguro_):[]};
}
function aceptarYEntregar_(db,req,d,u,reservado) {
  const t=db('prestamos'),p=buscar_(t,d.prestamo_id),items=detalles_(db,p.id);
  if(estado_(p)!==(reservado?'aceptado':'pendiente')) fallar_('El préstamo ya fue atendido o no corresponde a esta acción.');
  if(!items.length || items.some(i=>i.cantidad_entregada!==0 || i.cantidad_devuelta!==0)) fallar_('Revisa las cantidades de este préstamo antes de entregarlo.');
  const fecha=reservado?fechaCompleta_(p.fecha_limite):validarFechaLimite_(p.fecha_limite), config=configuracion_(db);
  if(!reservado && fecha.getTime()>Date.now()+config.maxDias*86400000) fallar_('La devolución supera el máximo permitido de días.');
  const entrega=reservado?fechaCompleta_(d.fecha_entrega):new Date();
  if(entrega.getTime()>Date.now()) fallar_('La entrega física no puede estar en el futuro.');
  const lista=validarItems_(db,items.map(i=>({material_id:i.material_id,cantidad:i.cantidad_solicitada})),!reservado);
  if(reservado) {
    if(d.confirmacion!=='ENTREGADO') fallar_('Confirma que el material reservado se entrega físicamente.');
    const movimientos=db('movimientos').rows.filter(r=>String(r.prestamo_id)===p.id);
    lista.forEach(i=>{
      const reservas=movimientos.filter(r=>String(r.material_id)===i.material.id && normalizarTextoFormulario_(r.tipo)==='reserva');
      const cantidad=reservas.reduce((sum,r)=>sum+entero_(r.cantidad,1,'reserva antigua'),0);
      if(cantidad!==i.cantidad || movimientos.some(r=>String(r.material_id)===i.material.id && ['devolucion','liberacion'].includes(normalizarTextoFormulario_(r.tipo)))) fallar_('No se puede confirmar la reserva de '+i.material.nombre+'. Revisa inventario y movimientos con el administrador.');
    });
  }
  lista.forEach((i,index)=>{
    if(!reservado) poner_(req,db('materiales'),i.material._fila,'existencia_disponible',i.material.existencia_disponible-i.cantidad);
    poner_(req,db('detalles_prestamos'),items[index]._fila,'cantidad_entregada',i.cantidad);
    movimiento_(db,req,i.material.id,p.id,reservado?'entrega_reservada':'salida',i.cantidad,u.id,reservado?'Entrega de reserva previa: sin nuevo descuento':'Solicitud aceptada y material entregado');
  });
  poner_(req,t,p._fila,'estado','entregado'); poner_(req,t,p._fila,'fecha_entrega',entrega);
  return {prestamo_id:p.id,estado:'entregado'};
}
function rechazarSolicitud_(db,req,d,u) {
  const t=db('prestamos'),p=buscar_(t,d.prestamo_id);
  if(estado_(p)!=='pendiente') fallar_('Solo se pueden rechazar solicitudes pendientes.');
  if(detalles_(db,p.id).some(i=>i.cantidad_entregada || i.cantidad_devuelta)) fallar_('Hay cantidades entregadas; revisa el registro.');
  poner_(req,t,p._fila,'estado','rechazado');
  movimiento_(db,req,'',p.id,'rechazo',0,u.id,'Solicitud rechazada sin afectar inventario');
  return {prestamo_id:p.id,estado:'rechazado'};
}
function registrarDevolucion_(db,req,d,u) {
  const t=db('prestamos'),p=buscar_(t,d.prestamo_id);
  if(!['entregado','parcial'].includes(estado_(p))) fallar_('El préstamo no admite devoluciones.');
  const items=detalles_(db,p.id),i=items.find(i=>i.material_id===String(d.material_id));
  if(!i) fallar_('El material no pertenece a este préstamo.');
  if(items.some(x=>x.cantidad_entregada===0)) fallar_('Hay materiales sin entrega registrada. Revisa los detalles antes de devolver.');
  const cantidad=entero_(d.cantidad,1,'devolución');
  if(cantidad>i.cantidad_entregada-i.cantidad_devuelta) fallar_('La cantidad supera lo pendiente de devolver.');
  const m=materiales_(db).find(m=>m.id===i.material_id);
  if(!m) fallar_('El material no existe en inventario.');
  if(m.existencia_disponible+cantidad>m.existencia_total) fallar_('La devolución haría que el disponible supere el total. Revisa el inventario.');
  i.cantidad_devuelta+=cantidad;
  const completo=items.every(i=>i.cantidad_devuelta===i.cantidad_entregada),estado=completo?'devuelto':'parcial';
  poner_(req,db('detalles_prestamos'),i._fila,'cantidad_devuelta',i.cantidad_devuelta);
  poner_(req,db('materiales'),m._fila,'existencia_disponible',m.existencia_disponible+cantidad);
  poner_(req,t,p._fila,'estado',estado);
  if(completo) poner_(req,t,p._fila,'fecha_devolucion',new Date());
  movimiento_(db,req,m.id,p.id,'devolucion',cantidad,u.id,'Cantidad recibida en oficina');
  return {prestamo_id:p.id,estado,cantidad_devuelta:cantidad};
}
function eliminarHistorial_(db,req,d,u) {
  exigirAdmin_(u);
  if(!Array.isArray(d.prestamo_ids)||!d.prestamo_ids.length||d.prestamo_ids.length>500) fallar_('Selecciona de 1 a 500 registros terminados.');
  const ids=[...new Set(d.prestamo_ids.map(String))],t=db('prestamos'),dt=db('detalles_prestamos');
  const prestamos=ids.map(id=>buscar_(t,id));
  prestamos.forEach(p=>{
    if(!['devuelto','rechazado','cancelado'].includes(estado_(p))) fallar_('No puedes borrar préstamos pendientes o activos.');
    if(detalles_(db,p.id).some(i=>i.cantidad_entregada!==i.cantidad_devuelta)) fallar_('Hay unidades pendientes en '+p.id+'. No se puede eliminar.');
  });
  borrarFilas_(req,dt,dt.rows.filter(r=>ids.includes(String(r.prestamo_id))).map(r=>r._fila));
  borrarFilas_(req,t,prestamos.map(p=>p._fila));
  prestamos.forEach(p=>movimiento_(db,req,'',p.id,'historial_eliminado',0,u.id,'Registro cerrado eliminado del historial; inventario sin cambios'));
  return {eliminados:prestamos.length};
}
