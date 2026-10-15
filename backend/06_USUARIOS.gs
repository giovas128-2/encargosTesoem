function rol_(u) { return normalizarTextoFormulario_(u.rol); }
function esAdmin_(u) { return ['admin','administrador'].includes(rol_(u)); }
function esPersonal_(u) { return ['admin','administrador','encargada','encargado','empleado'].includes(rol_(u)); }
function exigirAdmin_(u) { if (!esAdmin_(u)) fallar_('Solo el administrador puede hacer esto.','PERMISOS'); }
function usuarioSeguro_(u) {
  return {id:u.id,matricula:String(u.matricula),nombre:String(u.nombre),telefono:String(u.telefono),correo:String(u.correo),rol:esAdmin_(u)?'admin':'encargada',activo:booleano_(u.activo)};
}
function iguales_(a,b) {
  const x=hash_(String(a)),y=hash_(String(b)); let diff=0;
  for (let i=0;i<x.length;i++) diff |= x.charCodeAt(i)^y.charCodeAt(i);
  return diff===0;
}
function derivar_(password,salt,iters) {
  return TesoemCrypto.bytesToHex(TesoemCrypto.pbkdf2(TesoemCrypto.sha256,bytes_(password),TesoemCrypto.hexToBytes(salt),{c:iters,dkLen:32}));
}
function hashPassword_(password) {
  const salt=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');
  return 'pbkdf2-sha256$'+TESOEM.iteraciones+'$'+salt+'$'+derivar_(password,salt,TESOEM.iteraciones);
}
function comprobarPassword_(password,guardada) {
  const s=String(guardada ?? '');
  if (s.startsWith('pbkdf2-sha256$')) {
    const p=s.split('$');
    if (p.length!==4 || Number(p[1])!==TESOEM.iteraciones || !/^[a-f0-9]{64}$/.test(p[2]) || !/^[a-f0-9]{64}$/.test(p[3])) return false;
    return iguales_(derivar_(password,p[2],Number(p[1])),p[3]);
  }
  // Compatibilidad de una sola vez: se reemplaza por hash al iniciar sesión.
  return !!s && iguales_(password,s);
}
function autenticar_(db,token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) fallar_('Inicia sesión nuevamente.','SESION_INVALIDA');
  const s=db('_sesiones').rows.find(r=>r.id===hash_(token));
  if (!s || booleano_(s.revocada)) fallar_('La sesión ya no es válida.','SESION_INVALIDA');
  const exp=fechaISO_(s.expira);
  if (!exp || Date.parse(exp)<=Date.now()) fallar_('La sesión venció.','SESION_EXPIRADA');
  const u=db('usuarios').rows.find(u=>u.id===s.usuario_id);
  if (!u || !booleano_(u.activo) || !esPersonal_(u) || s.credencial!==hash_(String(u.contrasena))) fallar_('La cuenta cambió o está inactiva.','SESION_INVALIDA');
  return u;
}
function iniciarSesion_(ss,db,d) {
  const correo=correo_(d.correo), password=String(d.password ?? '');
  if (!password || password.length>128) fallar_('Correo o contraseña incorrectos.','CREDENCIALES');
  const accesos=db('_accesos'), now=Date.now(), ventana=15*60*1000;
  const claves=[['GLOBAL',60],[hash_(correo),5]];
  const req=[];
  claves.forEach(([id,max])=>{
    const row=accesos.rows.find(r=>r.id===id);
    const vigente=row && now-Number(row.inicio)<ventana;
    const n=vigente?Number(row.intentos):0;
    if (n>=max) fallar_('Demasiados intentos. Espera 15 minutos antes de volver a intentar.','LIMITE_ACCESO');
    if(row) { poner_(req,accesos,row._fila,'intentos',n+1); poner_(req,accesos,row._fila,'inicio',vigente?Number(row.inicio):now); }
    else agregar_(req,accesos,{id,intentos:1,inicio:now});
  });
  // El contador se confirma ANTES de calcular el hash, también si el proceso vence.
  guardarLote_(ss,req);
  const users=db('usuarios'), matches=users.rows.filter(u=>String(u.correo).trim().toLowerCase()===correo);
  const u=matches.length===1?matches[0]:null;
  if (!u || !esPersonal_(u) || !booleano_(u.activo) || !comprobarPassword_(password,u.contrasena)) {
    fallar_('Correo o contraseña incorrectos.','CREDENCIALES');
  }
  const writes=[], stored=String(u.contrasena).startsWith('pbkdf2-sha256$')?String(u.contrasena):hashPassword_(password);
  if(stored!==String(u.contrasena)) poner_(writes,users,u._fila,'contrasena',stored);
  const token=hash_(Utilities.getUuid()+Utilities.getUuid()),exp=new Date(now+TESOEM.horasSesion*3600000);
  const sesiones=db('_sesiones');
  borrarFilas_(writes,sesiones,sesiones.rows.filter(s=>booleano_(s.revocada) || !fechaISO_(s.expira) || Date.parse(fechaISO_(s.expira))<=now).map(s=>s._fila));
  agregar_(writes,sesiones,{id:hash_(token),usuario_id:u.id,expira:exp,revocada:false,credencial:hash_(stored)});
  // Si acaba de crearse, conserva el primer intento; evita releer rangos cacheados
  // por SpreadsheetApp después de escribir con el servicio avanzado.
  const cuenta=accesos.rows.find(r=>r.id===hash_(correo));
  if(cuenta) poner_(writes,accesos,cuenta._fila,'intentos',0);
  guardarLote_(ss,writes);
  return {ok:true,token,expira:exp.toISOString(),usuario:usuarioSeguro_(u)};
}
function revocarSesiones_(db,req,id) {
  const t=db('_sesiones'); t.rows.filter(r=>r.usuario_id===id && !booleano_(r.revocada)).forEach(r=>poner_(req,t,r._fila,'revocada',true));
}
function guardarEmpleado_(db,req,d,u) {
  exigirAdmin_(u);
  const t=db('usuarios'), actual=d.usuario_id?buscar_(t,d.usuario_id):null;
  if(actual && !esPersonal_(actual)) fallar_('Este registro no corresponde al personal.');
  const nombre=texto_(d.nombre,'el nombre',100),matricula=texto_(d.matricula,'la matrícula',30),correo=correo_(d.correo),telefono=texto_(d.telefono,'el teléfono',25,true);
  if(!/^[A-Za-z0-9_-]{3,30}$/.test(matricula)) fallar_('Matrícula inválida.');
  if(!['admin','encargada'].includes(d.rol) || typeof d.activo!=='boolean') fallar_('Rol o estado inválido.');
  if(t.rows.some(r=>r.id!==actual?.id && (String(r.correo).trim().toLowerCase()===correo || String(r.matricula).trim().toLowerCase()===matricula.toLowerCase()))) fallar_('El correo o matrícula ya está registrado.');
  if(actual && esAdmin_(actual) && booleano_(actual.activo) && (d.rol!=='admin'||!d.activo) && !t.rows.some(r=>r.id!==actual.id&&esAdmin_(r)&&booleano_(r.activo))) fallar_('Debe permanecer al menos un administrador activo.');
  const password=String(d.password ?? '');
  if((!actual || password) && (password.length<8 || password.length>128)) fallar_('La contraseña debe tener entre 8 y 128 caracteres.');
  const fields={nombre,matricula,correo,telefono,rol:d.rol,activo:d.activo};
  if(password) fields.contrasena=hashPassword_(password);
  const id=actual?.id || id_('USR');
  if(actual) {
    Object.keys(fields).forEach(k=>poner_(req,t,actual._fila,k,fields[k]));
    revocarSesiones_(db,req,id);
  } else agregar_(req,t,{id,...fields,fecha_registro:new Date()});
  movimiento_(db,req,'',id,'usuario_actualizado',0,u.id,'Cuenta de personal actualizada');
  return {usuario_id:id};
}
function eliminarEmpleado_(db,req,d,u) {
  exigirAdmin_(u);
  const t=db('usuarios'),r=buscar_(t,d.usuario_id);
  if(r.id===u.id) fallar_('No puedes eliminar tu propia cuenta.');
  if(!esPersonal_(r)) fallar_('Este registro no es personal de la oficina.');
  if(esAdmin_(r)&&booleano_(r.activo)&&!t.rows.some(x=>x.id!==r.id&&esAdmin_(x)&&booleano_(x.activo))) fallar_('No puedes eliminar al último administrador activo.');
  revocarSesiones_(db,req,r.id); borrarFilas_(req,t,[r._fila]);
  movimiento_(db,req,'',r.id,'usuario_eliminado',0,u.id,'Se conserva la auditoría de sus operaciones');
  return {usuario_id:r.id};
}
