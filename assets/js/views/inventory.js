function inventory() {
  const s = LoanStore.get();
  shell(
    `${heading("Inventario desde Google Sheets", "Las cantidades provienen de la API. El frontend no modifica existencias directamente.")}<div class="cards">${s.materials.map((m) => `<article class="material"><div class="material-visual">${icon(m.icon)}</div><span class="category">${esc(m.category)}</span><h3>${esc(m.name)}</h3><div class="availability"><span class="dot"></span>${m.available} disponibles</div><div class="material-bottom"><span>${m.total} en total</span><span>Máximo ${m.max}</span></div><p class="muted" style="font-size:11px;margin-top:12px">${m.active ? "Activo" : "Inactivo: no solicitar"}</p></article>`).join("")}</div>${!s.materials.length ? empty("Sin catálogo cargado", "Pulsa Actualizar para consultar materiales.") : ""}<div class="notice" style="margin-top:22px">${icon("info")} Aceptar reserva unidades. Entregar no vuelve a descontarlas. Devolver las reincorpora desde el backend.</div>`,
  );
}
