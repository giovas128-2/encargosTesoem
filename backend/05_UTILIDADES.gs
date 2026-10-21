function normalizarTextoFormulario_(v) {
  return String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function clave_(v) { return normalizarTextoFormulario_(v).replace(/[:\s]+/g, '_'); }
function texto_(v, campo, max, opcional) {
  const s = String(v ?? '').trim();
  if ((!s && !opcional) || s.length > max) fallar_('Revisa ' + campo + '.');
  return s;
}
function correo_(v) {
  const s = texto_(v, 'el correo electrónico', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) fallar_('El correo electrónico no es válido.');
  return s;
}
function entero_(v, min, campo) {
  const n = Number(v);
  if (v === '' || v == null || !Number.isSafeInteger(n) || n < min) fallar_('Cantidad inválida: ' + campo + '.');
  return n;
}
function booleano_(v) { return v === true || ['true','verdadero'].includes(String(v).trim().toLowerCase()); }
function fallar_(mensaje, codigo) { const e = new Error(mensaje); e.codigo = codigo || 'VALIDACION'; throw e; }
function libro_() { return SpreadsheetApp.openById(TESOEM.spreadsheetId); }
function instalado_() {
  if (PropertiesService.getScriptProperties().getProperty('TESOEM_INSTALADO') !== '2.1')
    fallar_('Ejecuta configurarSistema desde el editor de Apps Script.', 'CONFIGURACION');
}
function conBloqueo_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) fallar_('Hay otra operación en curso. Actualiza e inténtalo de nuevo.', 'OCUPADO');
  try { return fn(); } finally { lock.releaseLock(); }
}
function buscarHoja_(ss, nombre) {
  const matches = ss.getSheets().filter(s => clave_(s.getName()) === nombre);
  if (matches.length > 1) fallar_('Hay pestañas duplicadas para ' + nombre + '.');
  return matches[0] || null;
}
function tabla_(ss, nombre) {
  const sh = buscarHoja_(ss, nombre);
  if (!sh) fallar_('Falta la pestaña ' + nombre + '. Ejecuta configurarSistema para las pestañas internas.');
  const data = sh.getDataRange().getValues(), cols = {};
  data[0].forEach((h,i) => {
    const k = clave_(h);
    if (!k) return;
    if (Object.prototype.hasOwnProperty.call(cols,k)) fallar_('Encabezado repetido en ' + nombre + ': ' + k);
    cols[k] = i;
  });
  (ESQUEMAS[nombre] || []).forEach(k => { if (cols[k] === undefined) fallar_('Falta el encabezado ' + k + ' en ' + nombre + '.'); });
  const rows = data.slice(1).map((values,i) => {
    const obj = {_fila:i + 2}; Object.keys(cols).forEach(k => obj[k] = values[cols[k]] ?? ''); return obj;
  }).filter(r => Object.keys(cols).some(k => r[k] !== ''));
  const seen = new Set();
  if (cols.id !== undefined) rows.forEach(r => {
    r.id = String(r.id).trim();
    if (!r.id || seen.has(r.id)) fallar_('ID vacío o repetido en ' + nombre + ', fila ' + r._fila + '.');
    seen.add(r.id);
  });
  return {sh, cols, rows, ancho:data[0].length};
}
function db_(ss) {
  const cache = {};
  return n => cache[n] || (cache[n] = tabla_(ss, n));
}
function buscar_(t, id) {
  const r = t.rows.find(r => r.id === String(id ?? '').trim());
  if (!r) fallar_('No existe el registro solicitado en ' + t.sh.getName() + '.');
  return r;
}
function celda_(valor) {
  if (valor instanceof Date) valor = valor.toISOString();
  if (typeof valor === 'boolean') return {userEnteredValue:{boolValue:valor}};
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) fallar_('Valor numérico no válido.');
    return {userEnteredValue:{numberValue:valor}};
  }
  // RAW stringValue: texto del usuario nunca se interpreta como fórmula.
  return {userEnteredValue:{stringValue:String(valor ?? '')}};
}
function poner_(req, t, fila, campo, valor) {
  if (t.cols[campo] === undefined) fallar_('Columna inexistente: ' + campo);
  req.push({updateCells:{start:{sheetId:t.sh.getSheetId(),rowIndex:fila-1,columnIndex:t.cols[campo]},
    rows:[{values:[celda_(valor)]}],fields:'userEnteredValue'}});
}
function agregar_(req, t, obj) {
  const values = Array.from({length:t.ancho}, () => celda_(''));
  Object.keys(obj).forEach(k => { if (t.cols[k] === undefined) fallar_('Columna inexistente: ' + k); values[t.cols[k]] = celda_(obj[k]); });
  req.push({appendCells:{sheetId:t.sh.getSheetId(),rows:[{values}],fields:'userEnteredValue'}});
}
function borrarFilas_(req,t,filas) {
  [...new Set(filas)].sort((a,b) => b-a).forEach(fila => req.push({deleteDimension:{range:{sheetId:t.sh.getSheetId(),dimension:'ROWS',startIndex:fila-1,endIndex:fila}}}));
}
function guardarLote_(ss, req) {
  if (!req.length) return;
  // Única escritura atómica. NO reintentar automáticamente si se pierde la respuesta.
  try { Sheets.Spreadsheets.batchUpdate({requests:req}, ss.getId()); }
  catch (e) { fallar_('No se confirmó la escritura. Actualiza antes de repetir la operación.', 'RESULTADO_INCIERTO'); }
}
function id_(prefijo) { return prefijo + '-' + Utilities.getUuid().replace(/-/g,'').toUpperCase(); }
function bytes_(s) { return Uint8Array.from(Utilities.newBlob(String(s)).getBytes(), b => b & 255); }
function hash_(s) { return TesoemCrypto.bytesToHex(TesoemCrypto.sha256(bytes_(s))); }
function huellaPrivada_(s) {
  const secret = PropertiesService.getScriptProperties().getProperty('TESOEM_HUELLA_SECRET');
  if (!secret) fallar_('Ejecuta configurarSistema.');
  return TesoemCrypto.bytesToHex(Uint8Array.from(Utilities.computeHmacSha256Signature(s, secret), b => b & 255));
}
function serializarEstable_(v) {
  if (v instanceof Date) return JSON.stringify(v.toISOString());
  if (Array.isArray(v)) return '[' + v.map(serializarEstable_).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k)+':'+serializarEstable_(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function operacion_(ss, db, datos, responsable, trabajo) {
  const op = texto_(datos.operacion_id,'operacion_id',200);
  if (!/^[A-Za-z0-9:_-]{8,200}$/.test(op)) fallar_('operacion_id inválido.');
  const limpio = {...datos}; delete limpio.token; delete limpio.operacion_id;
  const huella = huellaPrivada_(serializarEstable_(limpio)), t = db('_operaciones');
  const anterior = t.rows.find(r => r.id === op);
  if (anterior) {
    if (anterior.usuario_id !== responsable.id || anterior.accion !== datos.accion || anterior.huella !== huella)
      fallar_('El identificador de operación ya se utilizó con otros datos.');
    return JSON.parse(anterior.respuesta);
  }
  const req = [], result = {ok:true,...trabajo(req)};
  agregar_(req,t,{id:op,usuario_id:responsable.id,accion:datos.accion,huella,respuesta:JSON.stringify(result),fecha:new Date()});
  guardarLote_(ss,req);
  return result;
}
function interpretarFechaCompleta_(texto,zona) {
  const f = 'yyyy-MM-dd HH:mm:ss'; let d;
  try { d = Utilities.parseDate(texto,zona,f); } catch (_) { fallar_('Fecha u hora inválida.'); }
  if (!Number.isFinite(d.getTime()) || Utilities.formatDate(d,zona,f) !== texto) fallar_('La fecha u hora no existe.');
  return d;
}
function unirFechaHoraFormulario_(fechaTexto,horaTexto) {
  const fecha = String(fechaTexto || '').trim();
  const h = String(horaTexto || '').toLowerCase().replace(/\./g,'').replace(/\s+/g,'');
  let p = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/), y,m,d;
  if (p) { [d,m,y] = p.slice(1).map(Number); }
  else { p = fecha.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (!p) fallar_('La fecha debe incluir día, mes y año.'); [y,m,d] = p.slice(1).map(Number); }
  const t = h.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(am|pm)?$/);
  if (!t) fallar_('Hora de devolución inválida.');
  let hh = Number(t[1]); const mm = Number(t[2]), sec = Number(t[3] || 0);
  if (t[4]) { if (hh < 1 || hh > 12) fallar_('Hora inválida.'); hh = hh%12 + (t[4]==='pm'?12:0); }
  if (hh > 23 || mm > 59 || sec > 59) fallar_('Hora inválida.');
  const dos = v => String(v).padStart(2,'0');
  return interpretarFechaCompleta_(`${y}-${dos(m)}-${dos(d)} ${dos(hh)}:${dos(mm)}:${dos(sec)}`,TESOEM.zona);
}
function fechaCompleta_(v) {
  let d;
  if (v instanceof Date) d = new Date(v.getTime());
  else {
    const p = String(v ?? '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.(\d{3}))?(Z|[+-]\d{2}:\d{2})$/);
    if (!p) fallar_('La fecha debe incluir día, hora y zona horaria.');
    if (p[4] !== 'Z' && (Number(p[4].slice(1,3)) > 14 || Number(p[4].slice(4)) > 59 || (Number(p[4].slice(1,3)) === 14 && Number(p[4].slice(4))))) fallar_('Zona horaria inválida.');
    d = interpretarFechaCompleta_(p[1]+' '+p[2],p[4]==='Z'?'GMT':'GMT'+p[4]);
    d = new Date(d.getTime()+Number(p[3]||0));
  }
  if (!Number.isFinite(d.getTime()) || d.getUTCFullYear() < 2020) fallar_('Fecha incompleta: corrige el día real de devolución.');
  return d;
}
function fechaISO_(v) { if (!v) return null; try { return fechaCompleta_(v).toISOString(); } catch (_) { return null; } }
function validarFechaLimite_(v) {
  const d = fechaCompleta_(v);
  if (d.getTime() <= Date.now()) fallar_('La devolución debe ser posterior a la fecha y hora actuales.');
  return d;
}
function contieneMaterial_(texto,material) {
  return String(texto||'').split(',').some(n => normalizarTextoFormulario_(n) === normalizarTextoFormulario_(material));
}
