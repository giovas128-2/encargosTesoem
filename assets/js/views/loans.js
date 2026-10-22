function listing(type) {
  const configs = {
    pendientes: ['Solicitudes pendientes','Revisa los materiales. Aceptar confirma la entrega al alumno y descuenta el inventario.',l=>l.status==='Pendiente'],
    activos: ['Préstamos activos','Permanecen aquí hasta devolver todas las unidades. Los vencidos también se incluyen.',LoanStore.active],
    vencidos: ['Préstamos vencidos','Préstamos activos que superaron la fecha y hora comprometidas.',LoanStore.overdue],
    historial: ['Historial','Devoluciones completas, rechazos y cancelaciones. Se conservan hasta que el administrador los elimine.',LoanStore.terminal]
  };
  const [title,desc,pred] = configs[type];
  const clear = type==='historial'&&user.role==='admin'?'<button class="btn outline danger" id="clear-history">Limpiar historial</button>':'';
  shell(`${heading(title,desc,type==='pendientes'?'<a class="btn outline" href="#simular">Registrar solicitud</a>':clear)}<div class="toolbar"><input class="search" id="search" placeholder="Buscar nombre, matrícula, correo o folio…" aria-label="Buscar préstamos" value="${esc(search)}"></div>${type==='vencidos'?whatsappNotice():''}<div id="results"></div>`);
  function results() {
    const list = LoanStore.get().loans.filter(pred).filter(l=>`${l.name} ${l.user} ${l.email} ${l.id}`.toLowerCase().includes(search.toLowerCase()));
    document.querySelector('#results').innerHTML = list.map(l=>card(l,type==='vencidos')).join('') || empty(LoanStore.status().fresh?'Sin registros en esta sección':'Actualiza la información',search?'Prueba con otra búsqueda.':'Aquí aparecerán los préstamos correspondientes.');
    bindCards();
  }
  results();
  const retry = document.querySelector('#retry-whatsapp');
  if (retry) retry.onclick = () => syncData();
  document.querySelector('#search').oninput=e=>{search=e.target.value;results();};
  const b=document.querySelector('#clear-history');
  if(b) {
    b.disabled=!LoanStore.status().fresh || !LoanStore.get().loans.some(LoanStore.terminal);
    b.onclick=()=>{
      const ids=LoanStore.get().loans.filter(LoanStore.terminal).map(l=>l.id);
      historyConfirm(ids);
    };
  }
}
async function runOperation(task, destination) {
  const panel=document.querySelector('.dialog'), error=document.querySelector('#dialog-error');
  panel.querySelectorAll('button').forEach(b=>b.disabled=true);
  try {
    await task();
    document.querySelectorAll('.dialog-backdrop').forEach(e=>e.remove());
    if(destination) go(destination);
    const okay=await syncData();
    toast(okay?'Registro guardado correctamente.':'La operación fue confirmada, pero falta actualizar la vista. Pulsa Actualizar.');
  } catch(e) {
    if(error.isConnected) {
      error.innerHTML=`<div class="error">${esc(e.message)}</div>`;
      panel.querySelectorAll('button').forEach(b=>b.disabled=e.uncertain&&!b.hasAttribute('data-close'));
    } else toast(e.message);
  }
}
function historyConfirm(ids) {
  if(ids.length>500) {
    toast('Puedes eliminar hasta 500 registros por operación. Se seleccionaron los primeros 500.');
    ids=ids.slice(0,500);
  }
  dialog(`<h2>${ids.length===1?'Eliminar registro':'Limpiar historial'}</h2><p>Se eliminarán ${ids.length} registro(s) terminado(s) del historial compartido. Los préstamos activos y las existencias no cambiarán. Esta acción no se puede deshacer.</p><form id="confirm-history"><div class="field"><label for="delete-word">Escribe ELIMINAR para confirmar</label><input id="delete-word" required pattern="ELIMINAR" autocomplete="off"></div><div class="actions"><button class="btn danger-solid">Eliminar definitivamente</button><button type="button" class="btn outline" data-close>Cancelar</button></div></form>`,()=>{
    document.querySelector('#confirm-history').onsubmit=e=>{e.preventDefault();runOperation(()=>ids.length===1?LoanStore.act(ids[0],'delete'):LoanStore.clearHistory(ids));};
  });
}
function bindCards() {
  document.querySelectorAll('[data-legacy]').forEach(b=>b.onclick=()=>{
    dialog(`<h2>Confirmar entrega reservada</h2><p>Solo para préstamos del sistema anterior. Confirma que el alumno recibió físicamente todos los materiales. El inventario ya fue descontado al reservar y no se descontará nuevamente.</p><form id="legacy-form"><div class="field"><label for="legacy-date">Fecha y hora reales de entrega (Ciudad de México)</label><input id="legacy-date" type="datetime-local" required max="${LoanStore.localDateTime()}" value="${LoanStore.localDateTime()}"></div><div class="actions"><button class="btn">Confirmar entrega física</button><button type="button" class="btn outline" data-close>Cancelar</button></div></form>`,()=>{
      document.querySelector('#legacy-form').onsubmit=e=>{e.preventDefault();const fecha=document.querySelector('#legacy-date').value+':00-06:00';runOperation(()=>LoanStore.act(b.dataset.legacy,'legacy',{fecha_entrega:fecha}),'activos');};
    });
  });
  const confirm=(id,verb,title,desc,label)=>dialog(`<h2>${title}</h2><p>${desc}</p><div class="actions"><button class="btn" id="confirm-api">${label}</button><button class="btn outline" data-close>Volver</button></div>`,()=>{
    document.querySelector('#confirm-api').onclick=()=>runOperation(()=>LoanStore.act(id,verb),verb==='accept'?'activos':null);
  });
  document.querySelectorAll('[data-accept]').forEach(b=>b.onclick=()=>{
    const l=LoanStore.get().loans.find(l=>l.id===b.dataset.accept);
    confirm(l.id,'accept','Aceptar y entregar',`Confirma que el alumno recibe: ${l.items.map(i=>`${i.qty} × ${esc(i.name)}`).join(', ')}. Se descontarán estas unidades y el préstamo quedará activo.`,'Confirmar préstamo');
  });
  document.querySelectorAll('[data-reject]').forEach(b=>b.onclick=()=>confirm(b.dataset.reject,'reject','Rechazar solicitud','Se guardará en el historial sin descontar inventario.','Confirmar rechazo'));
  document.querySelectorAll('[data-delete-history]').forEach(b=>b.onclick=()=>historyConfirm([b.dataset.deleteHistory]));
  document.querySelectorAll('[data-return]').forEach(b=>b.onclick=()=>{
    const l=LoanStore.get().loans.find(l=>l.id===b.dataset.return), pending=l.items.filter(i=>i.delivered>i.returned);
    if(!pending.length)return;
    dialog(`<h2>Registrar devolución</h2><p>Selecciona el material y la cantidad que el alumno devuelve ahora. Solo esas unidades regresarán al inventario.</p><form id="return-form"><div class="field"><label for="return-material">Material recibido</label><select name="material_id" id="return-material">${pending.map(i=>`<option value="${esc(i.id)}">${esc(i.name)} · ${i.delivered-i.returned} pendientes</option>`).join('')}</select></div><div class="field"><label for="return-qty">Cantidad recibida ahora</label><input id="return-qty" name="cantidad" type="number" min="1" max="${pending[0].delivered-pending[0].returned}" step="1" required value="1"></div><p class="muted">Si quedan unidades pendientes, el préstamo seguirá activo. Al devolver todo, pasará al historial.</p><div class="actions"><button class="btn">Confirmar devolución</button><button type="button" class="btn outline" data-close>Volver</button></div></form>`,()=>{
      document.querySelector('#return-material').onchange=e=>{const i=pending.find(i=>i.id===e.target.value);document.querySelector('#return-qty').max=i.delivered-i.returned;document.querySelector('#return-qty').value=1;};
      document.querySelector('#return-form').onsubmit=e=>{e.preventDefault();runOperation(()=>LoanStore.act(l.id,'return',Object.fromEntries(new FormData(e.target))));};
    });
  });
}
