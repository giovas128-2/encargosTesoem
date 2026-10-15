const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
(async () => {
  let role = 'admin', available = 10, delivered = 0, returned = 0, status = 'pendiente', deleted = false;
  let due = '2099-10-14T14:00:00-06:00', complete = true, fail = false;
  const calls = [];
  const backend = async (action, data) => {
    calls.push({action, data});
    if (action === 'panel') return {ok:true,version:2,completo:complete,usuarios:[],materiales:[{id:'MAT-001',nombre:'HDMI',existencia_total:10,existencia_disponible:available,limite_por_solicitud:3,activo:true}],prestamos:deleted?[]:[{id:'PRE-1',matricula:'001',estado:status,fecha_limite:due,fecha_solicitud:'2026-10-14T10:00:00-06:00',detalles:[{material_id:'MAT-001',cantidad_solicitada:2,cantidad_entregada:delivered,cantidad_devuelta:returned}]}]};
    if (fail) {const e=new Error('Respuesta perdida');e.uncertain=true;throw e;}
    if (action === 'aceptar_y_entregar') {status='entregado';delivered=2;available-=2;}
    if (action === 'registrar_devolucion') {returned+=data.cantidad;available+=data.cantidad;status=returned===delivered?'devuelto':'parcial';}
    if (action === 'eliminar_historial') deleted=true;
    return {ok:true};
  };
  const ctx=vm.createContext({structuredClone,Date,Set,Map,console,crypto,Intl,ApiClient:{post:backend},EmployeeStore:{current:()=>({role}),setList:()=>{}}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/js/services/loan-service.js'),'utf8')+'\nglobalThis.store=LoanStore;',ctx);
  const s=ctx.store;
  await s.refresh();assert.equal(s.get().materials[0].available,10);
  await s.act('PRE-1','accept');assert.equal(s.get().materials[0].available,10,'No inventario optimista');
  await s.refresh();assert.equal(s.get().materials[0].available,8);assert(s.active(s.get().loans[0]));
  assert(!s.overdue(s.get().loans[0]));
  due='2020-01-01T10:00:00-06:00';await s.refresh();assert(s.overdue(s.get().loans[0]));
  due='10:00:00';await s.refresh();assert(!s.overdue(s.get().loans[0]),'Una hora aislada no se clasifica como vencida');
  await assert.rejects(s.act('PRE-1','return',{material_id:'MAT-001',cantidad:3}));
  await s.act('PRE-1','return',{material_id:'MAT-001',cantidad:1});await s.refresh();assert.equal(s.get().loans[0].status,'Parcialmente devuelto');assert.equal(s.get().materials[0].available,9);
  await s.act('PRE-1','return',{material_id:'MAT-001',cantidad:1});await s.refresh();assert(s.terminal(s.get().loans[0]));assert(!s.active(s.get().loans[0]));assert.equal(s.get().materials[0].available,10);
  await s.refresh();assert.equal(s.get().loans.length,1,'El historial se recupera completo');
  role='employee';await assert.rejects(s.act('PRE-1','delete'));role='admin';
  fail=true;await assert.rejects(s.act('PRE-1','delete'));assert(s.status().writeBlocked);assert.equal(s.get().loans.length,1);await assert.rejects(s.act('PRE-1','delete'));
  fail=false;await s.refresh();await s.act('PRE-1','delete');await s.refresh();assert.equal(s.get().loans.length,0);assert.equal(s.get().materials[0].available,10);
  complete=false;await assert.rejects(s.refresh());assert.equal(s.status().fresh,false);
  assert(calls.filter(c=>c.action!=='panel').every(c=>c.data.operacion_id),'Operaciones identificables');
  console.log('OK: inventario remoto, parcial/completo, fechas, historial, roles, bloqueo de reintentos y listado completo.');
})().catch(e=>{console.error(e);process.exitCode=1;});
