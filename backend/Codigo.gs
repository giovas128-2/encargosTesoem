// TESOEM v2.1. Sustituye el Código.gs anterior COMPLETO; no mezclar versiones.
const TESOEM = Object.freeze({
  spreadsheetId: '15k0UFDP5DTgakWsthDn5XGG2KxXylH041sVQQbRGe-0',
  zona: 'America/Mexico_City',
  horasSesion: 8,
  iteraciones: 600000,
});
const ESQUEMAS = Object.freeze({
  usuarios: ['id','matricula','nombre','telefono','rol','activo','fecha_registro','contrasena','correo'],
  materiales: ['id','nombre','categoria','existencia_total','existencia_disponible','limite_por_solicitud','activo'],
  prestamos: ['id','matricula','nombre','telefono','estado','fecha_solicitud','fecha_limite','fecha_entrega','fecha_devolucion','motivo','correo'],
  detalles_prestamos: ['id','prestamo_id','material_id','cantidad_solicitada','cantidad_entregada','cantidad_devuelta'],
  movimientos: ['id','material_id','prestamo_id','tipo','cantidad','fecha','usuario_responsable','nota'],
  configuracion: ['parametro','valor'],
  _sesiones: ['id','usuario_id','expira','revocada','credencial'],
  _operaciones: ['id','usuario_id','accion','huella','respuesta','fecha'],
  _accesos: ['id','intentos','inicio'],
});

// Ejecutar una vez desde el editor, con el sistema en mantenimiento.
// No borra registros, no modifica contraseñas ni recalcula inventario.
function configurarSistema() {
  return conBloqueo_(function () {
    const ss = libro_();
    Object.keys(ESQUEMAS).filter(n => !n.startsWith('_')).forEach(n => tabla_(ss, n));
    ['_sesiones','_operaciones','_accesos'].forEach(n => {
      let sh = buscarHoja_(ss, n);
      if (!sh) {
        sh = ss.insertSheet(n);
        sh.getRange(1, 1, 1, ESQUEMAS[n].length).setValues([ESQUEMAS[n]]);
        sh.setFrozenRows(1);
        sh.hideSheet();
      }
      tabla_(ss, n);
    });
    ss.setSpreadsheetTimeZone(TESOEM.zona);
    SpreadsheetApp.flush();
    // Comprueba que el servicio avanzado esté habilitado, sin escribir datos.
    Sheets.Spreadsheets.get(ss.getId(), {fields: 'spreadsheetId'});
    const props = PropertiesService.getScriptProperties();
    if (!props.getProperty('TESOEM_HUELLA_SECRET')) props.setProperty('TESOEM_HUELLA_SECRET', Utilities.getUuid()+Utilities.getUuid());
    props.setProperty('TESOEM_INSTALADO', '2.1');
    const t = tabla_(ss, 'usuarios');
    const admins = t.rows.filter(u => esAdmin_(u) && booleano_(u.activo));
    const resultado = {ok:true, version:'2.1', administradores_activos:admins.length,
      aviso: admins.length ? 'Configurado. Publica una nueva versión y prueba el acceso.' : 'Asigna rol admin y activo TRUE a una cuenta existente antes de entrar.'};
    console.log(JSON.stringify(resultado));
    return resultado;
  });
}

// Ejecutar en el proyecto vinculado a la hoja. No usar activador desde Google Forms.
function instalarActivadorFormulario() {
  instalado_();
  const ss = libro_();
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'onFormSubmit')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  console.log('Activador de envío desde la hoja instalado para esta cuenta.');
}

// Diagnóstico de estructura: nunca imprime usuarios, contraseñas ni tokens.
function diagnosticarSistema() {
  const ss = libro_();
  const reporte = Object.keys(ESQUEMAS).map(n => {
    try { const t = tabla_(ss, n); return {hoja:n, ok:true, filas:t.rows.length}; }
    catch (e) { return {hoja:n, ok:false, error:e.message}; }
  });
  console.log(JSON.stringify(reporte));
  return reporte;
}
