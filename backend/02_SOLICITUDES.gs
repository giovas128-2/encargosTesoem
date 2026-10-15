function obtenerRespuestaFormulario_(respuestas,nombre) {
  const key=Object.keys(respuestas).find(k=>normalizarTextoFormulario_(k)===normalizarTextoFormulario_(nombre));
  const valor=key===undefined?'':respuestas[key];
  return String(Array.isArray(valor)?valor[0]??'':valor??'').trim();
}
function onFormSubmit(e) {
  instalado_();
  if(!e?.namedValues || !e.range) fallar_('Se necesita un envío real y el activador desde la hoja de cálculo. No ejecutar manualmente.');
  if(e.range.getSheet().getParent().getId()!==TESOEM.spreadsheetId || clave_(e.range.getSheet().getName())!=='respuestas_de_formulario_2')
    fallar_('El envío no corresponde a Respuestas de formulario 2 de esta base.');
  const r=e.namedValues, obtener=n=>obtenerRespuestaFormulario_(r,n);
  const seleccion=obtener('Materiales que necesitas').split(',').map(normalizarTextoFormulario_).filter(Boolean);
  const catalogo=[['Cable HDMI','MAT-001','Cantidad de cable HDMI'],['Proyector','MAT-002','Cantidad de Proyector'],['Extensión eléctrica','MAT-003','Cantidad de extensión eléctrica'],['Adaptador USB-C','MAT-004','Cantidad de Adaptador USB-C']];
  if(!seleccion.length) fallar_('Selecciona al menos un material.');
  if(new Set(seleccion).size!==seleccion.length) fallar_('Material repetido en el formulario.');
  const items=seleccion.map(s=>{
    const c=catalogo.find(c=>normalizarTextoFormulario_(c[0])===s);
    if(!c) fallar_('Material no reconocido en el formulario: '+s);
    return {material_id:c[1],cantidad:entero_(obtener(c[2]),1,'cantidad de '+c[0])};
  });
  // La columna antigua «fecha limite» se ignora por completo.
  const d={accion:'crear_solicitud_formulario',matricula:obtener('Matricula'),nombre:obtener('Nombre'),telefono:obtener('Telefono'),correo:obtener('correo'),motivo:obtener('Motivo'),items,
    fecha_limite:unirFechaHoraFormulario_(obtener('fecha de devolucion'),obtener('hora de devolucion')).toISOString()};
  // Identidad estable: hoja/fila/marca temporal, conservada en un reintento.
  d.operacion_id='FORM-'+hash_(TESOEM.spreadsheetId+':'+e.range.getSheet().getSheetId()+':'+e.range.getRow()+':'+obtener('Marca temporal'));
  return conBloqueo_(function(){
    const ss=libro_(),db=db_(ss);
    const result=operacion_(ss,db,d,{id:'FORMULARIO'},req=>crearSolicitud_(db,req,d));
    console.log('Solicitud registrada: '+result.prestamo_id);
    return result;
  });
}
function crearSolicitud_(db,req,d) {
  const matricula=texto_(d.matricula,'la matrícula',40),nombre=texto_(d.nombre,'el nombre',150),telefono=texto_(d.telefono,'el teléfono',30),correo=correo_(d.correo),motivo=texto_(d.motivo,'el motivo',2000);
  const fecha=validarFechaLimite_(d.fecha_limite),config=configuracion_(db);
  if(fecha.getTime()>Date.now()+config.maxDias*86400000) fallar_('La fecha supera el máximo de '+config.maxDias+' días.');
  // Pendiente no reserva stock. Se valida disponibilidad al aceptar.
  const items=validarItems_(db,d.items,false),id=id_('PRE'),now=new Date();
  agregar_(req,db('prestamos'),{id,matricula,nombre,telefono,correo,estado:'pendiente',fecha_solicitud:now,fecha_limite:fecha,fecha_entrega:'',fecha_devolucion:'',motivo});
  items.forEach(i=>agregar_(req,db('detalles_prestamos'),{id:id_('DET'),prestamo_id:id,material_id:i.material.id,cantidad_solicitada:i.cantidad,cantidad_entregada:0,cantidad_devuelta:0}));
  return {prestamo_id:id,estado:'pendiente'};
}
