function simulate() {
  const s = LoanStore.get(),
    available = s.materials.filter((m) => m.active && m.available > 0);
  shell(
    `${heading("Registro manual por API", "Herramienta de integración para el empleado en la oficina.")}<div class="notice warning">${icon("info")} Este formulario crea una solicitud real en Google Sheets. No es la simulación anterior. Úsalo solo con un registro autorizado. El QR de Google Forms sigue pendiente.</div><form id="request-api" class="panel" style="max-width:850px;margin:auto"><h2>Datos del alumno</h2><div class="formgrid"><div class="field"><label for="name">Nombre completo</label><input name="nombre" id="name" required maxlength="100"></div><div class="field"><label for="student">Matrícula</label><input id="student" name="matricula" required maxlength="60"></div></div><div class="formgrid"><div class="field"><label for="phone">Teléfono</label><input type="tel" id="phone" name="telefono" required pattern="[0-9+ ()-]{8,20}" maxlength="20"></div><div class="field"><label for="due">Fecha y hora límite</label><input type="datetime-local" id="due" name="fecha_limite" required min="${LoanStore.localDateTime()}"><small>Horario Ciudad de México (UTC−06:00).</small></div></div><div class="field"><label for="reason">Motivo</label><textarea id="reason" name="motivo" required maxlength="500"></textarea></div><div class="notice">${icon("mail")} El contrato de la API no admite correo electrónico. Sebas debe añadir ese campo para los recordatorios por Gmail.</div><h2>Materiales</h2>${available.map((m) => `<label class="returnrow"><span>${esc(m.name)}<small class="muted" style="display:block">${m.available} disponibles · Máximo ${m.max}</small></span><input name="qty-${esc(m.id)}" type="number" min="0" max="${Math.min(m.max, m.available)}" step="1" value="0" required></label>`).join("") || "<p>Sin materiales disponibles cargados.</p>"}<label class="check"><input type="checkbox" required>Confirmo que quiero crear esta solicitud en la API real.</label><div id="form-error" role="alert"></div><div class="actions"><button class="btn" id="submit-request" ${!LoanStore.status().fresh || !available.length ? "disabled" : ""}>Crear solicitud en API</button><a href="#pendientes" class="btn outline">Volver</a></div></form>`,
  );
  document.querySelector("#request-api").onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const items = available
      .filter((m) => Number(d["qty-" + m.id]) > 0)
      .map((m) => ({ material_id: m.id, cantidad: Number(d["qty-" + m.id]) }));
    const message = document.querySelector("#form-error"),
      button = document.querySelector("#submit-request");
    const date = d.fecha_limite + ":00-06:00";
    if (
      !items.length ||
      !d.nombre.trim() ||
      !d.matricula.trim() ||
      !d.motivo.trim() ||
      !Number.isFinite(Date.parse(date)) ||
      Date.parse(date) <= Date.now()
    ) {
      message.innerHTML =
        '<div class="error">Completa todos los campos, agrega un material y selecciona una hora futura.</div>';
      return;
    }
    button.disabled = true;
    button.textContent = "Enviando…";
    try {
      const result = await LoanStore.create({
        nombre: d.nombre.trim(),
        matricula: d.matricula.trim(),
        telefono: d.telefono.trim(),
        fecha_limite: date,
        motivo: d.motivo.trim(),
        items,
      });
      go("pendientes");
      await syncData();
      toast("Solicitud registrada: " + result.prestamo_id);
    } catch (err) {
      message.innerHTML = `<div class="error">${esc(err.message)}</div>`;
      button.disabled = !!err.uncertain;
      button.textContent = "Crear solicitud en API";
      if (err.uncertain)
        message.innerHTML +=
          "<p>Consulta la matrícula en Solicitudes antes de volver a crear el registro.</p>";
    }
  };
}
