function listing(type) {
  const configs = {
    pendientes: [
      "Solicitudes pendientes",
      "Aceptar reserva inventario. La entrega física se registra por separado.",
      (l) => l.status === "Pendiente",
    ],
    aceptados: [
      "Por entregar",
      "El material ya está reservado. Confirma la entrega cuando el estudiante lo reciba.",
      (l) => l.status === "Aceptado",
    ],
    activos: [
      "Préstamos activos consultados",
      "Préstamos de las matrículas consultadas durante esta sesión.",
      LoanStore.active,
    ],
    vencidos: [
      "Préstamos vencidos consultados",
      "Material entregado y pendiente después de la fecha y hora comprometidas.",
      LoanStore.overdue,
    ],
    historial: [
      "Historial consultado",
      "Devoluciones completas y rechazos de las matrículas consultadas.",
      (l) => ["Devuelto", "Rechazado"].includes(l.status),
    ],
  };
  const [title, desc, pred] = configs[type];
  shell(
    `${heading(title, desc, type === "pendientes" ? '<a class="btn outline" href="#simular">Registro manual por API</a>' : "")}${type === "vencidos" ? `<div class="notice warning">${icon("mail")} No hay envío de correos conectado. El contrato todavía no incluye correo del estudiante ni consulta de recordatorios.</div>` : ""}<form id="lookup" class="panel" style="margin-bottom:20px"><label for="matricula-lookup"><b>Consultar préstamos de un alumno</b></label><p class="muted" style="font-size:12px">Esta API solo permite pendientes globales y consultas por matrícula. Consulta aquí al alumno para recuperar sus préstamos activos, aceptados e historial.</p><div class="actions"><input class="search" id="matricula-lookup" name="matricula" required maxlength="60" placeholder="Matrícula del alumno"><button class="btn" id="lookup-button">Consultar en API</button></div><div id="lookup-message" role="status" style="margin-top:12px"></div></form><div class="toolbar"><input class="search" id="search" placeholder="Filtrar registros cargados…" aria-label="Filtrar por nombre, matrícula o folio" value="${esc(search)}"></div><div id="results"></div>`,
  );
  const results = () => {
    const list = LoanStore.get()
      .loans.filter(pred)
      .filter((l) =>
        `${l.name} ${l.user} ${l.id}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      );
    document.querySelector("#results").innerHTML =
      list.map(card).join("") ||
      empty(
        LoanStore.status().fresh
          ? "No hay registros cargados en esta sección"
          : "Falta actualizar los datos",
        "Consulta una matrícula o actualiza la información.",
      );
    bindCards();
  };
  results();
  document.querySelector("#search").oninput = (e) => {
    search = e.target.value;
    results();
  };
  document.querySelector("#lookup").onsubmit = async (e) => {
    e.preventDefault();
    const button = document.querySelector("#lookup-button"),
      message = document.querySelector("#lookup-message"),
      id = new FormData(e.target).get("matricula").trim();
    button.disabled = true;
    message.textContent = "Consultando…";
    try {
      const n = await LoanStore.lookup(id);
      results();
      message.textContent = `${n} préstamo(s) encontrados para ${id}. Selecciona la sección correspondiente a su estado.`;
    } catch (err) {
      message.textContent = err.message;
    } finally {
      button.disabled = false;
    }
  };
}
async function action(id, verb, values = {}) {
  const panel = document.querySelector(".dialog"),
    err = document.querySelector("#dialog-error");
  panel.querySelectorAll("button").forEach((b) => (b.disabled = true));
  try {
    await LoanStore.act(id, verb, values);
    document.querySelectorAll(".dialog-backdrop").forEach((e) => e.remove());
    const okay = await syncData();
    toast(
      okay
        ? "Acción confirmada por la API. Datos actualizados."
        : "La API confirmó la acción, pero falló la actualización. Pulsa Actualizar antes de continuar.",
    );
  } catch (e) {
    if (err.isConnected) {
      err.innerHTML = `<div class="error" style="margin-top:15px">${esc(e.message)}</div>`;
      panel.querySelectorAll("button").forEach((b) => (b.disabled = false));
      if (e.uncertain) {
        panel
          .querySelectorAll("button:not([data-close])")
          .forEach((b) => (b.disabled = true));
      }
    } else toast(e.message);
  }
}
function bindCards() {
  const confirm = (id, verb, title, desc, label) =>
    dialog(
      `<h2>${title}</h2><p>${desc}</p><p class="muted" style="font-size:12px">Esta operación modifica Google Sheets mediante la API. Operador de integración: ${esc(API_CONFIG.encargadoId)}.</p><div class="actions"><button class="btn" id="confirm-api">${label}</button><button class="btn outline" data-close>Volver</button></div>`,
      () =>
        (document.querySelector("#confirm-api").onclick = () =>
          action(id, verb)),
    );
  document
    .querySelectorAll("[data-accept]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          confirm(
            b.dataset.accept,
            "accept",
            "Aceptar y reservar",
            "La API comprobará disponibilidad y reservará las unidades. Después deberás registrar la entrega física.",
            "Aceptar solicitud",
          )),
    );
  document
    .querySelectorAll("[data-reject]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          confirm(
            b.dataset.reject,
            "reject",
            "Rechazar solicitud",
            "La solicitud pasará a rechazada. Este endpoint no recibe motivo del rechazo.",
            "Confirmar rechazo",
          )),
    );
  document
    .querySelectorAll("[data-deliver]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          confirm(
            b.dataset.deliver,
            "deliver",
            "Confirmar entrega física",
            "Confirma que el alumno está recibiendo los materiales. Esta acción no vuelve a descontar inventario.",
            "Registrar entrega",
          )),
    );
  document.querySelectorAll("[data-return]").forEach(
    (b) =>
      (b.onclick = () => {
        const l = LoanStore.get().loans.find((l) => l.id === b.dataset.return),
          pending = l.items.filter((i) => i.delivered > i.returned);
        dialog(
          `<h2>Registrar devolución</h2><p class="muted">Registra un material a la vez. Así cada confirmación corresponde a una sola operación de la API.</p><form id="return-form"><div class="field"><label for="return-material">Material recibido</label><select name="material_id" id="return-material">${pending.map((i) => `<option value="${esc(i.id)}">${esc(i.name)} · ${i.delivered - i.returned} pendientes</option>`).join("")}</select></div><div class="field"><label for="return-qty">Cantidad recibida ahora</label><input id="return-qty" name="cantidad" type="number" min="1" max="${pending[0]?.delivered - pending[0]?.returned}" step="1" required value="1"></div><div class="actions"><button class="btn">Confirmar devolución</button><button type="button" class="btn outline" data-close>Volver</button></div></form>`,
          () => {
            document.querySelector("#return-material").onchange = (e) => {
              const i = pending.find((i) => i.id === e.target.value);
              document.querySelector("#return-qty").max =
                i.delivered - i.returned;
              document.querySelector("#return-qty").value = 1;
            };
            document.querySelector("#return-form").onsubmit = (e) => {
              e.preventDefault();
              action(
                l.id,
                "return",
                Object.fromEntries(new FormData(e.target)),
              );
            };
          },
        );
      }),
  );
}
