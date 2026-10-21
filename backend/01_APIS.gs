function respuestaJSON(datos) {
  return ContentService.createTextOutput(JSON.stringify(datos)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() {
  // No exponer datos personales mediante GET público ni por matrícula.
  return respuestaJSON({ok:true,version:2,revision:'2.1',mensaje:'API TESOEM. Usa POST con sesión para acceder al panel.'});
}
function doPost(e) {
  try {
    const raw = e?.postData?.contents;
    if (!raw || raw.length > 50000) fallar_('Petición vacía o demasiado grande.');
    let data;
    try { data = JSON.parse(raw); } catch (_) { fallar_('JSON inválido.'); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) fallar_('Petición inválida.');
    return respuestaJSON(procesarAPI_(data));
  } catch (e) {
    if (!e.codigo) console.error('Error interno de API: ' + (e.stack || e.message));
    return respuestaJSON({ok:false,error:e.codigo ? e.message : 'Error interno. Revisa la configuración y las ejecuciones de Apps Script.',codigo:e.codigo || 'INTERNO'});
  }
}
function procesarAPI_(d) {
  instalado_();
  return conBloqueo_(function () {
    const ss = libro_(), db = db_(ss);
    if (d.accion === 'login') return iniciarSesion_(ss,db,d);
    const u = autenticar_(db,d.token);
    if (d.accion === 'sesion') return {ok:true,usuario:usuarioSeguro_(u)};
    if (d.accion === 'logout') {
      const t=db('_sesiones'), s=t.rows.find(r=>r.id===hash_(d.token)), req=[];
      poner_(req,t,s._fila,'revocada',true); guardarLote_(ss,req); return {ok:true};
    }
    if (d.accion === 'panel') return panel_(db,u);
    const acciones = {
      crear_solicitud: req => crearSolicitud_(db,req,d),
      aceptar_y_entregar: req => aceptarYEntregar_(db,req,d,u,false),
      confirmar_entrega_reservada: req => aceptarYEntregar_(db,req,d,u,true),
      rechazar_solicitud: req => rechazarSolicitud_(db,req,d,u),
      registrar_devolucion: req => registrarDevolucion_(db,req,d,u),
      eliminar_historial: req => eliminarHistorial_(db,req,{...d,prestamo_ids:[d.prestamo_id]},u),
      limpiar_historial: req => eliminarHistorial_(db,req,d,u),
      guardar_empleado: req => guardarEmpleado_(db,req,d,u),
      eliminar_empleado: req => eliminarEmpleado_(db,req,d,u),
    };
    if (!Object.prototype.hasOwnProperty.call(acciones,d.accion)) fallar_('Acción no reconocida. Actualiza también el frontend.');
    if (['eliminar_historial','limpiar_historial','guardar_empleado','eliminar_empleado'].includes(d.accion)) exigirAdmin_(u);
    return operacion_(ss,db,d,u,acciones[d.accion]);
  });
}
