// Solo lectura autenticada. Nunca envía mensajes ni modifica estado_contacto.
const WhatsAppStore = (() => {
  let records = new Map(), loading = false, error = '', loaded = false, pending = null;
  function reset() { records = new Map(); error = ''; loaded = false; }
  const phone = value => {
    const n = String(value || '').replace(/\D/g, '');
    return /^\d{10}$/.test(n) ? '52' + n : /^52\d{10}$/.test(n) ? n : '';
  };
  function refresh() {
    if (pending) return pending;
    reset(); loading = true;
    pending = (async () => {
      try {
        const data = await ApiClient.post('recordatorios_whatsapp');
        if (!Array.isArray(data.recordatorios)) throw Error('No pudimos cargar los recordatorios. Inténtalo de nuevo.');
        for (const r of data.recordatorios) {
          if (!r || typeof r !== 'object') continue;
          const id = String(r.prestamo_id || '').trim();
          if (id) records.set(id, records.has(id) ? null : r);
        }
        loaded = true;
      } catch (e) { error = e.message; records.clear(); }
      finally { loading = false; pending = null; }
    })();
    return pending;
  }
  function forLoan(l) {
    const unavailable = reason => ({url: '', reason});
    const state = LoanStore.status();
    if (!state.fresh || state.syncing || state.writing) return unavailable('Actualiza los préstamos antes de contactar.');
    if (!LoanStore.overdue(l) || !['Entregado', 'Parcialmente devuelto'].includes(l.status) ||
        !l.items.some(i => i.delivered > i.returned)) return unavailable('No hay una entrega vencida pendiente de devolución.');
    if (loading) return unavailable('Consultando recordatorios…');
    if (error) return unavailable('No se pudieron consultar los recordatorios. Usa Reintentar.');
    if (!loaded) return unavailable('Actualiza para consultar los recordatorios.');
    if (!records.has(l.id)) return unavailable('El aviso todavía no está disponible. Espera un momento y pulsa Actualizar.');
    const r = records.get(l.id);
    if (!r) return unavailable('Hay más de un aviso para este préstamo. Pide al administrador que lo revise.');
    if (String(r.matricula || '').trim() !== l.user ||
        Date.parse(r.fecha_limite) !== Date.parse(l.due)) return unavailable('El aviso necesita actualizarse con los datos del préstamo. Si persiste, comunícate con el administrador.');
    const number = phone(l.phone);
    if (!number || phone(r.telefono) !== number) return unavailable('Revisa el teléfono del alumno: debe ser válido y coincidir con el del aviso.');
    try {
      if (typeof r.enlace_whatsapp !== 'string' || !r.enlace_whatsapp.startsWith('https://wa.me/')) throw Error();
      const url = new URL(r.enlace_whatsapp);
      if (url.protocol !== 'https:' || url.hostname !== 'wa.me' || url.port || url.username || url.password || url.hash ||
          url.pathname !== '/' + number || url.searchParams.getAll('text').length !== 1 ||
          [...url.searchParams.keys()].some(k => k !== 'text') ||
          typeof r.mensaje !== 'string' || !r.mensaje.trim() || r.mensaje.length > 10000 ||
          url.searchParams.get('text') !== r.mensaje) throw Error();
      return {url: url.href, reason: ''};
    } catch (_) { return unavailable('No hay un enlace válido para abrir WhatsApp. Pide al administrador que revise el aviso.'); }
  }
  return {refresh, reset, forLoan, status: () => ({loading, error, loaded})};
})();
