function summary() {
  const s = LoanStore.get(),
    st = LoanStore.status(),
    pending = s.loans.filter((l) => l.status === "Pendiente"),
    active = s.loans.filter(LoanStore.active),
    late = s.loans.filter(LoanStore.overdue);
  shell(
    `${heading("Tu oficina, en orden.", "Revisa solicitudes y controla las entregas presenciales.", '<a href="#qr" class="btn">Registro por QR ' + icon("arrow") + "</a>")}<section class="hero"><div class="hero-copy"><span class="eyebrow">PRÉSTAMOS PRESENCIALES</span><h2>Solicita. Autoriza.<br>Entrega y recupera.</h2><p>Primero acepta para reservar el material. Después confirma la entrega física al estudiante.</p><div class="actions"><a class="btn white" href="#pendientes">Revisar solicitudes ${icon("arrow")}</a><a class="btn ghost" href="#aceptados">Por entregar</a></div></div><div class="hero-art" aria-hidden="true"><div class="orbit"></div><div class="art-card">${icon("projector")}<div class="bar"></div><div class="bar short"></div></div><div class="float-icon">${icon("check")}</div></div></section><div class="metrics admin-metrics">${metric(st.fresh ? pending.length : "—", "Pendientes consultados", "list", "pendientes")}${metric(st.fresh ? active.length : "—", "Activos consultados", "box", "activos")}${metric(st.fresh ? late.length : "—", "Vencidos consultados", "clock", "vencidos")}${metric(st.fresh ? s.materials.filter((m) => m.active).reduce((n, m) => n + m.available, 0) : "—", "Unidades disponibles", "grid", "inventario")}</div><div class="section-title"><h2>Solicitudes por atender</h2><a class="link" href="#pendientes">Ver solicitudes ${icon("arrow")}</a></div>${pending.slice(0, 2).map(card).join("") || empty(st.fresh ? "Sin pendientes en la última consulta" : "Esperando información de la API", st.fresh ? "Puedes consultar otros préstamos por matrícula." : "Pulsa Actualizar para consultar el backend.")}<div class="notice">${icon("mail")} Gmail y las cuentas de empleados todavía no tienen endpoints en el contrato recibido. Esta integración no envía recordatorios.</div>`,
  );
  bindCards();
}
