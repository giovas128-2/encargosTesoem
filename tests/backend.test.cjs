// Ejecuta los .gs reales con un emulador de Sheets. No accede a Google.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../backend');
let batchCount=0,failBefore=false,failAfter=false,locked=false;
class Sheet {
  constructor(name,values,id){this.name=name;this.values=values;this.id=id;}
  getName(){return this.name;} getSheetId(){return this.id;} getParent(){return book;}
  getDataRange(){return {getValues:()=>structuredClone(this.values)};}
  getRange(row,col,rows,cols){return {setValues:values=>{values.forEach((r,i)=>{this.values[row-1+i] ||= []; r.forEach((v,j)=>this.values[row-1+i][col-1+j]=v);});}};}
  setFrozenRows(){} hideSheet(){}
}
const book={sheets:[],getId:()=> '15k0UFDP5DTgakWsthDn5XGG2KxXylH041sVQQbRGe-0',getSheets(){return this.sheets;},insertSheet(name){const s=new Sheet(name,[],this.sheets.length+1);this.sheets.push(s);return s;},setSpreadsheetTimeZone(){}};
function add(name,headers,rows=[]){book.sheets.push(new Sheet(name,[headers,...rows],book.sheets.length+1));}
const props=new Map();
function zoneOffset(zone){if(zone==='America/Mexico_City')return -360;if(zone==='GMT')return 0;const p=zone.match(/^GMT([+-])(\d{2}):(\d{2})$/);if(!p)throw Error('zone');return (p[1]==='-'?-1:1)*(+p[2]*60 + +p[3]);}
function parseDate(s,zone){const d=new Date(s.replace(' ','T')+'Z');return new Date(d.getTime()-zoneOffset(zone)*60000);}
function formatDate(d,zone){return new Date(d.getTime()+zoneOffset(zone)*60000).toISOString().slice(0,19).replace('T',' ');}
function batchUpdate({requests},id){
  assert.equal(id,book.getId());batchCount++;
  if(failBefore){failBefore=false;throw Error('simulated pre-commit failure');}
  const clone=new Map(book.sheets.map(s=>[s.id,structuredClone(s.values)]));
  const cell=v=>{const e=v.userEnteredValue||{};assert(!e.formulaValue,'User text must not become a formula');return e.stringValue??e.numberValue??e.boolValue??'';};
  for(const r of requests){
    if(r.updateCells){const {start,rows}=r.updateCells,data=clone.get(start.sheetId);rows.forEach((row,i)=>{data[start.rowIndex+i]||=[];row.values.forEach((v,j)=>data[start.rowIndex+i][start.columnIndex+j]=cell(v));});}
    else if(r.appendCells){const a=r.appendCells;clone.get(a.sheetId).push(...a.rows.map(r=>r.values.map(cell)));}
    else if(r.deleteDimension){const {range:rng}=r.deleteDimension;clone.get(rng.sheetId).splice(rng.startIndex,rng.endIndex-rng.startIndex);}
    else throw Error('Unsupported request');
  }
  book.sheets.forEach(s=>s.values=clone.get(s.id));
  if(failAfter){failAfter=false;throw Error('simulated lost response after commit');}
  return {};
}
const context=vm.createContext({console,Date,Uint8Array,Uint32Array,Int32Array,ArrayBuffer,DataView,Set,Map,
  SpreadsheetApp:{openById:id=>{assert.equal(id,book.getId());return book;},flush(){}},
  LockService:{getScriptLock:()=>({tryLock(){if(locked)return false;locked=true;return true;},releaseLock(){locked=false;}})},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},
  Sheets:{Spreadsheets:{batchUpdate,get:()=>({spreadsheetId:book.getId()})}},
  Utilities:{getUuid:crypto.randomUUID,newBlob:s=>({getBytes:()=>Array.from(Buffer.from(s))}),parseDate,formatDate,computeHmacSha256Signature:(s,key)=>Array.from(crypto.createHmac('sha256',key).update(s).digest())},
  ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>({text:s})})},
});
for(const f of fs.readdirSync(root).filter(f=>f.endsWith('.gs')).sort())new vm.Script(fs.readFileSync(path.join(root,f),'utf8'),{filename:f}).runInContext(context);
const schema=vm.runInContext('ESQUEMAS',context);
const now=new Date(),tomorrow=new Date(Date.now()+86400000).toISOString(),past=new Date(Date.now()-86400000).toISOString();
add('usuarios',schema.usuarios.map(h=>h==='contrasena'?'contraseña':h),[
 ['USR-A','EMP001','Admin Prueba','5500000001','admin',true,now,'Secreta123!','admin@example.test'],
 ['USR-E','EMP002','Encargada Prueba','5500000002','encargada',true,now,'Encargada123!','empleada@example.test'],
 ['USR-S','ALU001','Alumno','5500000003','alumno',true,now,'Alumno123!','alumno@example.test'],
]);
add('materiales',schema.materiales,[['MAT-001','Cable HDMI','Cable',10,10,5,true],['MAT-002','Proyector','Equipo',3,3,2,true],['MAT-003','Extensión eléctrica','Cable',8,8,3,true],['MAT-004','Adaptador USB-C','Adaptador',5,5,2,true]]);
add('prestamos',schema.prestamos);add('detalles_prestamos',schema.detalles_prestamos);
add('movimientos',schema.movimientos.map(h=>h==='material_id'?'material:id':h));
add('configuracion',schema.configuracion,[['max_dias_prestamo',7],['max_items_por_solicitud',10]]);
const rows=n=>context.tabla_(book,n).rows;
context.configurarSistema();
let seq=0;
function call(accion,data={},token){const d={accion,...data,...(token?{token}:{}),operacion_id:data.operacion_id||`TEST-${++seq}-operation`};return {data:d,result:JSON.parse(context.doPost({postData:{contents:JSON.stringify(d)}}).text)};}
function ok(accion,data={},token){const {result}=call(accion,data,token);assert.equal(result.ok,true,JSON.stringify(result));return result;}
function bad(accion,data={},token){const {result}=call(accion,data,token);assert.equal(result.ok,false,JSON.stringify(result));return result;}
const stock=id=>Number(rows('materiales').find(m=>m.id===id).existencia_disponible);
const loan=id=>rows('prestamos').find(p=>p.id===id);
const crear=(token,overrides={})=>ok('crear_solicitud',{matricula:'2024001',nombre:'Alumno Prueba',telefono:'5512345678',correo:'alumno@example.test',motivo:'Clase',items:[{material_id:'MAT-001',cantidad:2},{material_id:'MAT-002',cantidad:1}],fecha_limite:tomorrow,...overrides},token).prestamo_id;
// Syntax: all files share one global namespace without duplicate functions.
const names=[...fs.readdirSync(root).filter(f=>f.endsWith('.gs')&&f!=='07_CRYPTO.gs').map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n').matchAll(/^function (\w+)\(/gm)].map(m=>m[1]);assert.equal(new Set(names).size,names.length);
assert(!JSON.stringify(context.doGet()).includes('prestamos_usuario'));
bad('panel');bad('login',{correo:'admin@example.test',password:'incorrecta'});bad('login',{correo:'alumno@example.test',password:'Alumno123!'});
const admin=ok('login',{correo:'admin@example.test',password:'Secreta123!'}).token;
assert(rows('usuarios')[0].contrasena.startsWith('pbkdf2-sha256$600000$'));
// Compare actual bundled KDF against Node's standard implementation at production work factor.
const stored=rows('usuarios')[0].contrasena.split('$');assert.equal(stored[3],crypto.pbkdf2Sync('Secreta123!',Buffer.from(stored[2],'hex'),600000,32,'sha256').toString('hex'));
const again=ok('login',{correo:'admin@example.test',password:'Secreta123!'}).token;
const employee=ok('login',{correo:'empleada@example.test',password:'Encargada123!'}).token;
const publicPanel=ok('panel',{},employee);assert.equal(publicPanel.completo,true);assert.equal(publicPanel.usuarios.length,0);
assert(!JSON.stringify(ok('panel',{},admin)).includes('pbkdf2'));assert(!JSON.stringify(ok('panel',{},admin)).includes('Secreta'));
bad('eliminar_empleado',{usuario_id:'USR-A'},employee);
bad('guardar_empleado',{usuario_id:'USR-A',nombre:'A',matricula:'EMP001',correo:'admin@example.test',telefono:'',rol:'encargada',activo:true},admin);
// Create, atomic accept, duplicate click and operation replay.
const id=crear(admin);assert.equal(stock('MAT-001'),10);
const count=batchCount;const accepted=ok('aceptar_y_entregar',{prestamo_id:id,operacion_id:'accept-once-0001'},employee);assert.equal(batchCount,count+1);assert.equal(accepted.estado,'entregado');assert.equal(stock('MAT-001'),8);assert.equal(stock('MAT-002'),2);
ok('aceptar_y_entregar',{prestamo_id:id,operacion_id:'accept-once-0001'},employee);assert.equal(stock('MAT-001'),8);
bad('aceptar_y_entregar',{prestamo_id:id},employee);
bad('aceptar_y_entregar',{prestamo_id:'different',operacion_id:'accept-once-0001'},employee);
bad('registrar_devolucion',{prestamo_id:id,material_id:'MAT-001',cantidad:3},employee);assert.equal(stock('MAT-001'),8);
assert.equal(ok('registrar_devolucion',{prestamo_id:id,material_id:'MAT-001',cantidad:1},employee).estado,'parcial');assert.equal(stock('MAT-001'),9);
assert.equal(ok('registrar_devolucion',{prestamo_id:id,material_id:'MAT-001',cantidad:1},employee).estado,'parcial');assert.equal(stock('MAT-001'),10);
assert.equal(ok('registrar_devolucion',{prestamo_id:id,material_id:'MAT-002',cantidad:1},employee).estado,'devuelto');assert.equal(stock('MAT-002'),3);assert(loan(id).fecha_devolucion);
assert(ok('panel',{},again).prestamos.some(p=>p.id===id&&p.estado==='devuelto'));
bad('registrar_devolucion',{prestamo_id:id,material_id:'MAT-002',cantidad:1},employee);
bad('eliminar_historial',{prestamo_id:id},employee);
// A mixed history deletion validates everything before any row deletion.
const pending=crear(admin);bad('limpiar_historial',{prestamo_ids:[id,pending]},admin);assert(loan(id));assert(loan(pending));
const movements=rows('movimientos').length;
ok('eliminar_historial',{prestamo_id:id},admin);assert(!loan(id));assert(!rows('detalles_prestamos').some(d=>d.prestamo_id===id));assert(rows('movimientos').length>movements);assert.equal(stock('MAT-001'),10);
// Failure before batch commit changes nothing; failure after commit is replay-safe.
failBefore=true;const fail=call('aceptar_y_entregar',{prestamo_id:pending,operacion_id:'atomic-before-0001'},employee);assert.equal(fail.result.codigo,'RESULTADO_INCIERTO');assert.equal(stock('MAT-001'),10);assert.equal(loan(pending).estado,'pendiente');
ok('aceptar_y_entregar',fail.data,employee);assert.equal(stock('MAT-001'),8);
failAfter=true;const lost=call('registrar_devolucion',{prestamo_id:pending,material_id:'MAT-001',cantidad:1,operacion_id:'atomic-after-0001'},employee);assert.equal(lost.result.codigo,'RESULTADO_INCIERTO');assert.equal(stock('MAT-001'),9);
ok('registrar_devolucion',lost.data,employee);assert.equal(stock('MAT-001'),9);
// New request: no stock, over limit, fractional, repeated material, invalid dates.
const req={matricula:'2',nombre:'A',telefono:'55',correo:'a@example.test',motivo:'M',fecha_limite:tomorrow,items:[{material_id:'MAT-001',cantidad:1}]};
for(const patch of [{items:[{material_id:'MAT-001',cantidad:1.5}]},{items:[{material_id:'MAT-001',cantidad:1},{material_id:'MAT-001',cantidad:1}]},{items:[{material_id:'MAT-001',cantidad:6}]},{fecha_limite:'2026-10-15'},{fecha_limite:past},{correo:''}])bad('crear_solicitud',{...req,...patch},admin);
assert.throws(()=>context.unirFechaHoraFormulario_('31/02/2027','12:00'));
assert.equal(context.unirFechaHoraFormulario_('20/10/2027','2:30 p. m.').toISOString(),'2027-10-20T20:30:00.000Z');
assert.equal(context.unirFechaHoraFormulario_('20/10/2027','12:00 a. m.').toISOString(),'2027-10-20T06:00:00.000Z');
assert.equal(context.fechaISO_(new Date('1899-12-30T18:00:00Z')),null);
// Form event with accent-insensitive current headers, old date ignored, duplicate trigger replay.
const local=new Date(Date.now()+86400000-360*60000).toISOString().slice(0,10);
const event={range:{getSheet:()=>({getName:()=> 'Respuestas de formulario 2',getSheetId:()=>99,getParent:()=>book}),getRow:()=>25},namedValues:{'Marca temporal':['timestamp-test'],'Nombre':['Formulario'],'Matricula':['2024555'],'Telefono':['5512345678'],'correo':['form@example.test'],'Motivo':['Clase'],'Materiales que necesitas':['Cable HDMI, Extensión eléctrica'],'Cantidad de cable HDMI':['1'],'Cantidad de extensión eléctrica ':['2'],' fecha limite':['00:01:00'],'fecha de devolucion':[local],'hora de devolucion':['23:30']}};
const form=context.onFormSubmit(event);assert.equal(loan(form.prestamo_id).estado,'pendiente');assert.equal(context.onFormSubmit(event).prestamo_id,form.prestamo_id);
const missing=structuredClone(event.namedValues);missing['Cantidad de cable HDMI']=[''];assert.throws(()=>context.onFormSubmit({...event,namedValues:missing}));
// Literal formula text remains a string (no formulaValue anywhere in batch emulator).
const literal=crear(admin,{nombre:'=IMPORTXML("https://example.test","//x")'});assert(loan(literal).nombre.startsWith('='));
// Legacy reserved loan: reconcile physical handover without second stock deduction.
const legacy=crear(admin,{items:[{material_id:'MAT-004',cantidad:1}]});
const pr=context.tabla_(book,'prestamos'),mr=context.tabla_(book,'materiales');pr.sh.values[loan(legacy)._fila-1][pr.cols.estado]='aceptado';
const m4=mr.rows.find(r=>r.id==='MAT-004');mr.sh.values[m4._fila-1][mr.cols.existencia_disponible]=4;
const mov=context.tabla_(book,'movimientos');mov.sh.values.push(['MOV-LEGACY','MAT-004',legacy,'reserva',1,now,'USR-E','Legacy']);
ok('confirmar_entrega_reservada',{prestamo_id:legacy,confirmacion:'ENTREGADO',fecha_entrega:now.toISOString()},employee);assert.equal(stock('MAT-004'),4);
ok('registrar_devolucion',{prestamo_id:legacy,material_id:'MAT-004',cantidad:1},employee);assert.equal(stock('MAT-004'),5);
// Active overdue stays active in persisted state; panel returns full date.
const pt=context.tabla_(book,'prestamos');pt.sh.values[loan(pending)._fila-1][pt.cols.fecha_limite]=past;
assert.equal(ok('panel',{},admin).prestamos.find(p=>p.id===pending).estado,'parcial');
// Staff CRUD, uniqueness, last admin/self protections, inactive session rejection.
bad('eliminar_empleado',{usuario_id:'USR-A'},admin);
ok('guardar_empleado',{usuario_id:'USR-E',nombre:'Encargada Editada',matricula:'EMP002',correo:'empleada@example.test',telefono:'55',rol:'encargada',activo:false},admin);
assert.equal(bad('panel',{},employee).codigo,'SESION_INVALIDA');
const newUser=ok('guardar_empleado',{nombre:'Nuevo',matricula:'EMP003',correo:'nuevo@example.test',telefono:'',rol:'encargada',activo:true,password:'NuevoPass123'},admin).usuario_id;
assert(rows('usuarios').find(u=>u.id===newUser).contrasena.startsWith('pbkdf2-sha256$'));
bad('guardar_empleado',{nombre:'Otro',matricula:'EMP003',correo:'otro@example.test',telefono:'',rol:'encargada',activo:true,password:'OtroPass123'},admin);
ok('eliminar_empleado',{usuario_id:newUser},admin);assert(!rows('usuarios').find(u=>u.id===newUser));
ok('logout',{},again);assert.equal(bad('panel',{},again).codigo,'SESION_INVALIDA');
locked=true;assert.equal(bad('panel',{},admin).codigo,'OCUPADO');locked=false;
console.log('OK backend real (.gs) en emulador: sesiones, KDF, permisos, formulario, inventario, devoluciones, historial, atomicidad, reintentos y reservas anteriores.');

// Integración: mismo transporte y stores del navegador contra estos .gs reales.
(async()=>{
  const storage=new Map();
  Object.assign(context,{URL,structuredClone,crypto:{randomUUID:crypto.randomUUID},AbortController,setTimeout,clearTimeout,
    API_CONFIG:{url:'https://backend.example.test/exec',timeoutMs:60000,postContentType:'text/plain;charset=UTF-8'},
    location:{pathname:'/interfaces/index.html',replace(){}},
    sessionStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    fetch:async(url,options)=>({ok:true,json:async()=>JSON.parse(context.doPost({postData:{contents:options.body}}).text)})});
  for(const f of ['api-client.js','employee-service.js','loan-service.js'])vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../assets/js/services',f),'utf8'),context);
  await vm.runInContext("EmployeeStore.login('admin@example.test','Secreta123!')",context);
  await vm.runInContext('LoanStore.refresh()',context);
  const before=stock('MAT-001');
  context.formData={...req,items:[{material_id:'MAT-001',cantidad:1}]};
  const created=await vm.runInContext('LoanStore.create(formData)',context);
  context.targetId=created.prestamo_id;
  await vm.runInContext('LoanStore.refresh()',context);
  await vm.runInContext("LoanStore.act(targetId,'accept')",context);assert.equal(stock('MAT-001'),before-1);
  await vm.runInContext('LoanStore.refresh()',context);
  await vm.runInContext("LoanStore.act(targetId,'return',{material_id:'MAT-001',cantidad:1})",context);
  await vm.runInContext('LoanStore.refresh()',context);
  assert.equal(vm.runInContext('LoanStore.get().loans.find(l=>l.id===targetId).status',context),'Devuelto');
  assert.equal(stock('MAT-001'),before);
  await vm.runInContext("LoanStore.act(targetId,'delete')",context);await vm.runInContext('LoanStore.refresh()',context);
  assert.equal(vm.runInContext('LoanStore.get().loans.some(l=>l.id===targetId)',context),false);
  // La respuesta incierta del backend también bloquea el store real.
  const created2=await vm.runInContext('LoanStore.create(formData)',context);context.targetId=created2.prestamo_id;
  await vm.runInContext('LoanStore.refresh()',context);failAfter=true;
  await assert.rejects(vm.runInContext("LoanStore.act(targetId,'accept')",context));
  assert.equal(vm.runInContext('LoanStore.status().writeBlocked',context),true);
  await vm.runInContext('LoanStore.refresh()',context);
  assert.equal(vm.runInContext('LoanStore.get().loans.find(l=>l.id===targetId).status',context),'Entregado');
  console.log('OK integración: ApiClient + EmployeeStore + LoanStore ejecutan login, creación, aceptación, devolución, historial y recuperación contra los .gs reales emulados.');
})().catch(e=>{console.error(e);process.exitCode=1;});
