// Estado remoto completo. No se persisten ni se eliminan préstamos solo en el navegador.
const LoanStore = (() => {
  let state = { materials: [], loans: [] }, fresh = false, syncing = null, writing = false, writeBlocked = false, lastSync = null;
  const states = { pendiente: 'Pendiente', aceptado: 'Aceptado', entregado: 'Entregado', parcial: 'Parcialmente devuelto', devuelto: 'Devuelto', rechazado: 'Rechazado', cancelado: 'Cancelado' };
  const integer = n => { n = Number(n); if (!Number.isSafeInteger(n) || n < 0) throw Error('Hay una cantidad incorrecta en los registros. Comunícate con el administrador.'); return n; };
  const array = a => { if (!Array.isArray(a)) throw Error('No se recibió toda la información. Actualiza e inténtalo de nuevo.'); return a; };
  const fullDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).getUTCFullYear() >= 2020;
  function loan(l) {
    if (!l.id || !l.matricula || !states[l.estado]) throw Error('Formato de préstamo inesperado.');
    const items = array(l.detalles).map(i => {
      const item = { id: String(i.material_id), name: String(i.material || i.material_id), qty: integer(i.cantidad_solicitada), delivered: integer(i.cantidad_entregada), returned: integer(i.cantidad_devuelta) };
      if (item.returned > item.delivered || item.delivered > item.qty) throw Error('Las cantidades de un préstamo son inconsistentes.');
      return item;
    });
    return { id: String(l.id), user: String(l.matricula), name: String(l.nombre || ''), phone: String(l.telefono || ''), email: String(l.correo || ''), status: states[l.estado], created: l.fecha_solicitud, due: l.fecha_limite, dueValid: fullDate(l.fecha_limite), deliveredAt: l.fecha_entrega, returnedAt: l.fecha_devolucion, reason: String(l.motivo || ''), hasDetails: items.length > 0, items };
  }
  const active = l => ['Aceptado','Entregado','Parcialmente devuelto'].includes(l.status);
  const terminal = l => ['Devuelto','Rechazado','Cancelado'].includes(l.status);
  const overdue = l => active(l) && l.dueValid && Date.parse(l.due) < Date.now();
  const material = m => ({ id: String(m.id), name: String(m.nombre), category: String(m.categoria || 'Material'), total: integer(m.existencia_total), available: integer(m.existencia_disponible), max: integer(m.limite_por_solicitud), active: m.activo === true, icon: ({'MAT-001':'cable','MAT-002':'projector','MAT-003':'plug','MAT-004':'usb'})[m.id] || 'box' });
  async function refresh() {
    if (syncing) return syncing;
    if (writing) throw Error('Espera a que termine la operación.');
    fresh = false;
    syncing = (async () => {
      const d = await ApiClient.post('panel');
      if (d.version !== 2 || d.completo !== true) throw Error('No pudimos cargar la información completa. Actualiza la página; si continúa, avisa al administrador.');
      const loans = array(d.prestamos).map(loan), materials = array(d.materiales).map(material);
      if (new Set(loans.map(l => l.id)).size !== loans.length) throw Error('Hay préstamos repetidos en los registros. Comunícate con el administrador.');
      if (materials.some(m => m.available > m.total)) throw Error('El inventario disponible supera el total.');
      if (EmployeeStore.current()?.role === 'admin') EmployeeStore.setList(array(d.usuarios));
      state = { loans, materials };
      fresh = true; writeBlocked = false; lastSync = new Date().toISOString();
      return structuredClone(state);
    })();
    try { return await syncing; } finally { syncing = null; }
  }
  async function mutate(action, values) {
    if (!fresh || writeBlocked) throw Error('Actualiza los datos antes de continuar.');
    if (writing || syncing) throw Error('Espera a que termine la operación.');
    writing = true;
    try {
      const result = await ApiClient.post(action, { ...values, operacion_id: crypto.randomUUID() });
      fresh = false;
      return result;
    } catch (e) {
      if (e.uncertain) { fresh = false; writeBlocked = true; }
      throw e;
    } finally { writing = false; }
  }
  return {
    get: () => structuredClone(state), active, overdue, terminal, fullDate, refresh,
    status: () => ({fresh, syncing: !!syncing, writing, writeBlocked, lastSync}),
    localDateTime: (iso = new Date().toISOString()) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'America/Mexico_City', year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)).map(x=>[x.type,x.value]));
      return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
    },
    saveMaterial: data => {
      if (EmployeeStore.current()?.role !== 'admin') throw Error('Solo el administrador puede editar el inventario.');
      return mutate('guardar_material', data);
    },
    create: data => mutate('crear_solicitud', data),
    act: async (id, action, data = {}) => {
      const l = state.loans.find(l => l.id === id);
      if (!l) throw Error('El préstamo ya no está disponible. Actualiza.');
      const map = { accept: 'aceptar_y_entregar', legacy: 'confirmar_entrega_reservada', reject: 'rechazar_solicitud', return: 'registrar_devolucion', delete: 'eliminar_historial' };
      if (!map[action]) throw Error('Acción desconocida.');
      if (['accept','reject'].includes(action) && l.status !== 'Pendiente') throw Error('La solicitud ya fue atendida.');
      if (action === 'accept' && (!l.hasDetails || !l.dueValid || Date.parse(l.due) <= Date.now())) throw Error('Corrige la fecha límite o los materiales antes de aceptar.');
      if (action === 'return' && !active(l)) throw Error('Este préstamo no está activo.');
      if (action === 'delete' && (!terminal(l) || EmployeeStore.current()?.role !== 'admin')) throw Error('Solo un administrador puede eliminar registros terminados.');
      const payload = { prestamo_id: id };
      if (action === 'legacy') {
        if (l.status !== 'Aceptado' || !fullDate(data.fecha_entrega) || Date.parse(data.fecha_entrega) > Date.now()) throw Error('Revisa la fecha de entrega física.');
        Object.assign(payload, {confirmacion:'ENTREGADO', fecha_entrega:data.fecha_entrega});
      }
      if (action === 'return') {
        const item = l.items.find(i => i.id === data.material_id), n = Number(data.cantidad);
        if (!item || !Number.isSafeInteger(n) || n < 1 || n > item.delivered - item.returned) throw Error('La cantidad supera lo pendiente de devolver.');
        Object.assign(payload, { material_id: item.id, cantidad: n });
      }
      return mutate(map[action], payload);
    },
    clearHistory: ids => {
      if (EmployeeStore.current()?.role !== 'admin') throw Error('Solo el administrador puede limpiar el historial.');
      if (!ids.length || ids.some(id => !state.loans.some(l => l.id === id && terminal(l)))) throw Error('Solo pueden eliminarse registros terminados.');
      return mutate('limpiar_historial', { prestamo_ids: ids });
    }
  };
})();
