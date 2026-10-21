const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
(async () => {
  let payload, calls = 0, failure = false;
  const loan = {id:'PRE-A',user:'2024001',phone:'5512345678',status:'Entregado',due:'2026-01-01T18:00:00Z',items:[{delivered:2,returned:0}]};
  const record = {prestamo_id:loan.id,matricula:loan.user,telefono:loan.phone,fecha_limite:loan.due,mensaje:'Mensaje de prueba',enlace_whatsapp:'https://wa.me/525512345678?text=Mensaje%20de%20prueba'};
  const context = vm.createContext({URL,Date,Map,ApiClient:{post:async action=>{
    assert.equal(action,'recordatorios_whatsapp'); calls++; if(failure)throw Error('Sin conexión');return payload;
  }},LoanStore:{status:()=>({fresh:true}),overdue:l=>Date.parse(l.due)<Date.now()}});
  vm.runInContext(fs.readFileSync('assets/js/services/whatsapp-service.js','utf8')+'\nglobalThis.store=WhatsAppStore;',context);
  const store=context.store;
  payload={recordatorios:[{...record,prestamo_id:'PRE-B',telefono:'5599999999'},record]};
  await Promise.all([store.refresh(),store.refresh()]);
  assert.equal(calls,1,'Consulta única concurrente');
  assert.equal(store.forLoan(loan).url,record.enlace_whatsapp,'Cruce por ID');
  for(const link of ['javascript:alert(1)','https://wa.me.evil.test/525512345678?text=x','https://wa.me/525599999999?text=Mensaje%20de%20prueba','https://wa.me/525512345678?text=x','https://wa.me/525512345678?text=Mensaje%20de%20prueba&text=x']){
    payload={recordatorios:[{...record,enlace_whatsapp:link}]};await store.refresh();
    assert.equal(store.forLoan(loan).url,'');
  }
  payload={recordatorios:[record,record,record]};await store.refresh();
  assert.equal(store.forLoan(loan).url,'','Duplicados');
  payload={recordatorios:[record]};await store.refresh();
  assert.equal(store.forLoan({...loan,status:'Cancelado'}).url,'');
  assert.equal(store.forLoan({...loan,items:[{delivered:2,returned:2}]}).url,'');
  assert.equal(store.forLoan({...loan,user:'otro'}).url,'');
  assert.equal(store.forLoan({...loan,phone:''}).url,'');
  assert.equal(store.forLoan({...loan,due:'2030-01-01T00:00:00Z'}).url,'');
  failure=true;await store.refresh();
  assert.equal(store.status().error,'Sin conexión');assert.equal(store.forLoan(loan).url,'');
  failure=false;await store.refresh();assert.ok(store.forLoan(loan).url);
  // Transporte real en entorno controlado: token, errores de sesión y solo lectura.
  let body, cleared=false, redirected=false;
  const transport=vm.createContext({URL,AbortController,setTimeout,clearTimeout,
    API_CONFIG:{url:'https://example.test',timeoutMs:1000,postContentType:'text/plain'},
    EmployeeStore:{token:()=> 'token-de-prueba',clear:()=>{cleared=true;}},
    location:{pathname:'/interfaces/index.html',replace:()=>{redirected=true;}},
    fetch:async(_,options)=>{body=JSON.parse(options.body);return {ok:true,json:async()=>({ok:false,codigo:'SESION_EXPIRADA',error:'Sesión expirada'})};}});
  vm.runInContext(fs.readFileSync('assets/js/services/api-client.js','utf8')+'\nglobalThis.client=ApiClient;',transport);
  await assert.rejects(transport.client.post('recordatorios_whatsapp'),e=>e.uncertain===false);
  assert.deepEqual(body,{accion:'recordatorios_whatsapp',token:'token-de-prueba'});
  assert.ok(cleared && redirected);
  console.log('WhatsApp: ID, consulta única, URL, teléfono, duplicados, estados, recuperación y sesión: correcto.');
})().catch(e=>{console.error(e);process.exitCode=1;});
