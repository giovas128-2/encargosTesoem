function card(l, showWhatsApp = false) {
  const st = LoanStore.status(),
    blocked = !st.fresh || st.syncing || st.writing;
  const outstanding = l.items.reduce((n, i) => n + i.delivered - i.returned, 0);
  return `<article class="loan"><div class="loan-head"><div><strong>${esc(l.name)}</strong><small class="muted" style="display:block;margin-top:5px;overflow-wrap:anywhere">${esc(l.id)} · Matrícula ${esc(l.user)}</small></div><div>${badge(l.status)}${LoanStore.overdue(l) ? '<span class="badge overdue">Vencido</span>' : ""}</div></div>
  <div class="loan-items">${l.items.map((i) => `${i.qty} × ${esc(i.name)} <small class="muted">(${i.delivered} prestados · ${i.returned} devueltos · ${i.delivered - i.returned} pendientes)</small>`).join("<br>") || "Sin materiales registrados"}</div>
  ${!l.dueValid && !LoanStore.terminal(l) ? '<div class="notice warning">Falta la fecha y hora de devolución. Solicita su corrección antes de aceptar el préstamo.</div>' : ""}
  ${l.status === "Aceptado" ? '<div class="notice warning">Reserva del flujo anterior. Confirma la entrega física para poder registrar devoluciones, sin descontar otra vez.</div>' : ""}
  <div class="loan-meta"><div><small>Solicitud</small>${fmt(l.created)}</div><div><small>Fecha y hora límite</small><strong>${l.dueValid ? fmt(l.due) : "Fecha incompleta"}</strong></div><div><small>Correo</small>${esc(l.email || "Sin registrar")}</div><div><small>Teléfono</small>${esc(l.phone || "Sin registrar")}</div>${l.returnedAt ? `<div><small>Devolución completa</small>${fmt(l.returnedAt)}</div>` : ""}</div>
  ${l.reason ? `<p class="muted" style="margin-top:15px">${esc(l.reason)}</p>` : ""}
  <div class="actions">${l.status === "Pendiente" ? `<button class="btn small" data-accept="${esc(l.id)}" ${blocked || !l.hasDetails || !l.dueValid ? "disabled" : ""}>Aceptar y entregar</button><button class="btn outline small" data-reject="${esc(l.id)}" ${blocked ? "disabled" : ""}>Rechazar</button>` : ""}
  ${l.status === "Aceptado" ? `<button class="btn small" data-legacy="${esc(l.id)}" ${blocked || !l.hasDetails || !l.dueValid ? "disabled" : ""}>Confirmar entrega reservada</button>` : ""}
  ${LoanStore.active(l) && l.status !== "Aceptado" ? `<button class="btn small" data-return="${esc(l.id)}" ${blocked || !l.hasDetails || outstanding < 1 ? "disabled" : ""}>Registrar devolución</button>` : ""}
  ${LoanStore.terminal(l) && user.role === "admin" ? `<button class="btn outline small danger" data-delete-history="${esc(l.id)}" ${blocked ? "disabled" : ""}>Eliminar del historial</button>` : ""}</div>${showWhatsApp === true ? whatsappCard(l) : ""}</article>`;
}
