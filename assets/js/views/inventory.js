function inventory() {
  const s = LoanStore.get(), st = LoanStore.status();
  const admin = user.role === 'admin', blocked = !st.fresh || st.syncing || st.writing;
  shell(`${heading('Inventario', 'Consulta los materiales, sus cantidades y los límites de préstamo.', admin ? '<button class="btn" id="add-material" '+(blocked?'disabled':'')+'>+ Agregar material</button>' : '')}
    <div class="cards">${s.materials.map(m=>`<article class="material"><div class="material-visual">${icon(m.icon)}</div><span class="category">${esc(m.category)}</span><h3>${esc(m.name)}</h3><div class="availability"><span class="dot"></span>${m.available} disponibles</div><div class="material-bottom"><span>${m.total} en total</span><span>Máximo ${m.max}</span></div><p class="muted">${m.total-m.available} prestados o reservados · ${m.active?'Activo':'Inactivo'}</p>${admin?`<button class="btn outline small" data-edit-material="${esc(m.id)}" ${blocked?'disabled':''}>Editar inventario</button>`:''}</article>`).join('')}</div>
    ${!s.materials.length?empty('Sin materiales','Actualiza el catálogo o agrega un material.'):''}
    <div class="notice" style="margin-top:22px">Aceptar y entregar descuenta unidades disponibles. Las devoluciones las reincorporan. ${admin?'Puedes ajustar el total y el límite; las unidades prestadas se conservan.':''}</div>`);
  const add = document.querySelector('#add-material');
  if (add) add.onclick = () => materialForm();
  document.querySelectorAll('[data-edit-material]').forEach(b=>b.onclick=()=>materialForm(b.dataset.editMaterial));
}
function materialForm(id) {
  if (user.role !== 'admin') return;
  const m = id ? LoanStore.get().materials.find(m=>m.id===id) :
    {name:'',category:'Material',total:0,available:0,max:1,active:true};
  if (!m) return;
  const committed = m.total-m.available;
  dialog(`<h2>${id?'Editar inventario':'Agregar material'}</h2>
    <form id="material-form">
      <div class="field"><label for="mat-name">Nombre del material</label><input id="mat-name" name="nombre" value="${esc(m.name)}" maxlength="100" required pattern="[^,]+"></div>
      <div class="field"><label for="mat-category">Categoría</label><input id="mat-category" name="categoria" value="${esc(m.category)}" maxlength="100" required></div>
      <div class="formgrid">
        <div class="field"><label for="mat-total">Existencia total</label><input id="mat-total" name="existencia_total" type="number" min="${committed}" step="1" value="${m.total}" required><small>Incluye las unidades prestadas y disponibles.</small></div>
        <div class="field"><label for="mat-limit">Límite por solicitud</label><input id="mat-limit" name="limite_por_solicitud" type="number" min="1" step="1" value="${m.max}" required></div>
      </div>
      <p id="mat-preview" class="notice" aria-live="polite"></p>
      <div class="field"><label for="mat-active">Estado</label><select id="mat-active" name="activo"><option value="true" ${m.active?'selected':''}>Activo</option><option value="false" ${!m.active?'selected':''}>Inactivo</option></select><small>Inactivo impide nuevos préstamos; permite devolver los existentes.</small></div>
      <div class="field"><label for="mat-note">Motivo del cambio</label><textarea id="mat-note" name="nota" required maxlength="500" placeholder="Ejemplo: compra de 3 cables o baja de 1 unidad dañada"></textarea></div>
      <p class="muted">Si agregas o cambias el nombre de un material, actualiza también el formulario de registro de alumnos. Se mantiene el máximo general de artículos por solicitud.</p>
      <div class="actions"><button class="btn">Guardar inventario</button><button class="btn outline" type="button" data-close>Cancelar</button></div>
    </form>`,()=>{
    document.querySelector('.dialog').setAttribute('aria-label',id?'Editar inventario':'Agregar material');
    const total=document.querySelector('#mat-total'), preview=document.querySelector('#mat-preview');
    const update=()=>{
      const n=total.value===''?NaN:Number(total.value);
      preview.textContent=Number.isSafeInteger(n)&&n>=committed?
        `Quedarán ${n-committed} disponibles y ${committed} prestados o reservados. Cambio en total: ${n-m.total>0?'+':''}${n-m.total}.`:
        `El total debe ser un entero de al menos ${committed} unidades.`;
    };
    total.oninput=update; update();
    document.querySelector('#material-form').onsubmit=e=>{
      e.preventDefault();
      const form=Object.fromEntries(new FormData(e.target));
      const data={...form,existencia_total:Number(form.existencia_total),
        limite_por_solicitud:Number(form.limite_por_solicitud),activo:form.activo==='true'};
      if(id) Object.assign(data,{material_id:id,base:{nombre:m.name,categoria:m.category,
        existencia_total:m.total,existencia_disponible:m.available,limite_por_solicitud:m.max,activo:m.active}});
      runOperation(()=>LoanStore.saveMaterial(data));
    };
  });
}
