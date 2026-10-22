function whatsappCard(l) {
  const contact = WhatsAppStore.forLoan(l);
  if (!contact.url) return `<div class="whatsapp-contact"><button class="btn outline small" disabled>Enviar WhatsApp</button><p class="muted">${esc(contact.reason)}</p></div>`;
  return `<div class="whatsapp-contact"><a class="btn small" href="${esc(contact.url)}" target="_blank" rel="noopener noreferrer" aria-label="Enviar WhatsApp del préstamo ${esc(l.id)} (abre otra pestaña)">Enviar WhatsApp</a><p class="muted">Revisa el mensaje y envíalo manualmente en WhatsApp. Abrirlo no lo marca como enviado.</p><a class="whatsapp-fallback" href="${esc(contact.url)}" rel="noreferrer">Si no abre, abrir en esta pestaña</a></div>`;
}
function whatsappNotice() {
  const st = WhatsAppStore.status();
  return `<div class="notice ${st.error ? 'warning' : ''}" role="status">${st.error ? esc(st.error) : st.loading ? 'Consultando recordatorios de WhatsApp…' : 'Los avisos se preparan automáticamente. Pulsa Actualizar para consultar los disponibles. Tú revisas y envías cada mensaje en WhatsApp.'}${st.error ? '<button class="btn outline small" id="retry-whatsapp">Reintentar recordatorios</button>' : ''}</div>`;
}
