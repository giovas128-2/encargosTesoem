const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
(async()=>{
 const saved=new Map();let reject=false,role='admin',calls=[];
 const ctx=vm.createContext({structuredClone,Date,console,sessionStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},ApiClient:{post:async(a,d)=>{calls.push([a,d]);if(reject)throw Error('Acceso rechazado');return {ok:true,token:'test-token',expira:'2099-01-01T00:00:00Z',usuario:{id:'A',rol:role,nombre:'Prueba',correo:'test@example.test',activo:true}};}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/js/services/employee-service.js'),'utf8')+'\nglobalThis.auth=EmployeeStore;',ctx);const a=ctx.auth;
 await a.init();assert.equal(a.current(),null);
 reject=true;await assert.rejects(a.login('test@example.test','secret-test'));assert.equal(a.current(),null);
 reject=false;role='solicitante';await assert.rejects(a.login('test@example.test','secret-test'));assert.equal(a.current(),null);
 role='admin';await a.login('test@example.test','secret-test');assert.equal(a.current().role,'admin');assert(![...saved.values()].some(v=>v.includes('secret-test')));
 role='encargada';await a.init();assert.equal(a.current().role,'employee');await assert.rejects(a.remove('B'));
 reject=true;await assert.rejects(a.init());assert.equal(a.current(),null);assert.equal(saved.size,0);
 console.log('OK: acceso fallido, exclusión de alumnos, sesión remota, roles actualizados, no persistencia de contraseña, sesión revocada.');
})().catch(e=>{console.error(e);process.exitCode=1;});
