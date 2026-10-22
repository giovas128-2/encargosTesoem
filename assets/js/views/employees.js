// views/employees.js

function employees() {
  if (user.role !== "admin") {
    shell(
      `${heading("Acceso exclusivo del administrador", "Solo el administrador puede registrar o modificar cuentas.")}<a class="btn" href="#inicio">Volver al resumen</a>`,
    );
    return;
  }
  const all = EmployeeStore.list();
  shell(
    `${heading("Equipo de la oficina", "Administra al personal autorizado de la oficina.", '<button class="btn" id="add-employee">+ Agregar empleado</button>')}<div class="metrics">${metric(all.length, "Empleados registrados", "shield", "empleados")}${metric(all.filter((e) => e.active).length, "Cuentas activas", "check", "empleados")}${metric(all.filter((e) => e.role === "admin").length, "Administradores", "grid", "empleados")}</div><div class="toolbar"><input class="search" id="employee-search" aria-label="Buscar empleado" placeholder="Buscar nombre, matrícula o correo…"><select class="filter" id="employee-status" aria-label="Filtrar empleados por estado"><option value="all">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></div><div class="employee-grid" id="employee-results"></div><div class="notice" style="margin-top:24px">${icon("info")} Cada persona tiene su propio acceso y permisos. Las contraseñas se mantienen privadas.</div>`,
  );
  const results = () => {
    let term = document.querySelector("#employee-search").value.toLowerCase(),
      status = document.querySelector("#employee-status").value;
    const list = EmployeeStore.list().filter(
      (e) =>
        `${e.name} ${e.matricula} ${e.email}`.toLowerCase().includes(term) &&
        (status === "all" || e.active === (status === "active")),
    );
    document.querySelector("#employee-results").innerHTML =
      list
        .map(
          (e) =>
            `<article class="panel employee-card"><div class="employee-head"><span class="avatar">${esc(
              e.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join(""),
            )}</span><div><h3>${esc(e.name)}${e.id === user.id ? ' <small class="muted">(Tú)</small>' : ""}</h3><span class="muted">${e.role === "admin" ? "Administrador" : "Empleado"}</span></div><span class="badge ${e.active ? "done" : ""}">${e.active ? "Activo" : "Inactivo"}</span></div><dl class="employee-data"><div><dt>Matrícula</dt><dd>${esc(e.matricula)}</dd></div><div><dt>Correo electrónico</dt><dd>${esc(e.email)}</dd></div><div><dt>Teléfono</dt><dd>${esc(e.phone || "Sin registrar")}</dd></div></dl><div class="actions"><button class="btn outline small" data-edit-employee="${esc(e.id)}">Editar empleado</button><button class="btn outline small danger" data-delete-employee="${esc(e.id)}" ${e.id === user.id ? 'disabled title="No puedes eliminar tu propia cuenta"' : ""}>Eliminar</button></div></article>`,
        )
        .join("") ||
      empty(
        "No encontramos empleados",
        "Prueba con otros datos o agrega un empleado.",
      );
    document
      .querySelectorAll("[data-edit-employee]")
      .forEach((b) => (b.onclick = () => employeeForm(b.dataset.editEmployee)));
    document.querySelectorAll("[data-delete-employee]").forEach(
      (b) =>
        (b.onclick = () => {
          const employee = EmployeeStore.list().find(
            (e) => e.id === b.dataset.deleteEmployee,
          );
          dialog(
            `<h2>¿Eliminar empleado?</h2><p>Se eliminará la cuenta de <b>${esc(employee.name)}</b>, matrícula <b>${esc(employee.matricula)}</b>. Ya no podrá iniciar sesión.</p><p class="muted">Los registros de préstamos permanecerán en el sistema. También puedes desactivar la cuenta desde Editar.</p><div class="actions"><button class="btn danger-solid" id="confirm-delete">Eliminar empleado</button><button class="btn outline" data-close>Cancelar</button></div>`,
            () =>
              (document.querySelector("#confirm-delete").onclick = async () => {
                document.querySelector("#confirm-delete").disabled = true;
                try {
                  await EmployeeStore.remove(employee.id);
                  await syncData();
                  render();
                  toast("Empleado eliminado.");
                } catch (err) {
                  document.querySelector("#dialog-error").innerHTML =
                    `<div class="error">${esc(err.message)}</div>`;
                }
              }),
          );
        }),
    );
  };
  results();
  document.querySelector("#employee-search").oninput = results;
  document.querySelector("#employee-status").onchange = results;
  document.querySelector("#add-employee").onclick = () => employeeForm();
}

function employeeForm(id) {
  const e = id
    ? EmployeeStore.list().find((e) => e.id === id)
    : {
        name: "",
        matricula: "",
        email: "",
        phone: "",
        area: "Oficina de materiales",
        role: "employee",
        active: true,
      };
  if (!e) return;
  dialog(
    `<h2>${id ? "Editar empleado" : "Agregar empleado"}</h2><p class="muted">${id ? "Actualiza los datos y permisos de acceso." : "Crea su cuenta para que ingrese con correo y contraseña."}</p><form id="employee-form"><div class="field"><label for="employee-name">Nombre completo</label><input id="employee-name" name="name" required maxlength="100" value="${esc(e.name)}"></div><div class="formgrid"><div class="field"><label for="employee-id">Matrícula</label><input id="employee-id" name="matricula" required pattern="[a-zA-Z0-9_-]{3,30}" maxlength="30" value="${esc(e.matricula)}"><small>Única, sin espacios.</small></div></div><div class="field"><label for="employee-email">Correo electrónico</label><input id="employee-email" name="email" type="email" required maxlength="160" value="${esc(e.email)}"></div><div class="field"><label for="employee-phone">Teléfono (opcional)</label><input id="employee-phone" name="phone" type="tel" maxlength="25" value="${esc(e.phone)}"></div><div class="formgrid"><div class="field"><label for="employee-role">Rol</label><select id="employee-role" name="role"><option value="employee" ${e.role === "employee" ? "selected" : ""}>Empleado</option><option value="admin" ${e.role === "admin" ? "selected" : ""}>Administrador</option></select></div><div class="field"><label for="employee-active">Estado</label><select id="employee-active" name="active"><option value="yes" ${e.active ? "selected" : ""}>Activo</option><option value="no" ${!e.active ? "selected" : ""}>Inactivo</option></select></div></div><div class="field"><label for="employee-password">${id ? "Nueva contraseña (opcional)" : "Contraseña de acceso"}</label><input id="employee-password" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" ${id ? "" : "required"}><small>${id ? "Déjala vacía para conservar la contraseña actual." : "Mínimo 8 caracteres. Comunícala al empleado al registrar su cuenta."}</small></div><div class="field"><label for="employee-confirm">Confirmar ${id ? "nueva " : ""}contraseña</label><input id="employee-confirm" name="confirm" type="password" autocomplete="new-password" maxlength="128" ${id ? "" : "required"}></div><div class="actions"><button class="btn" id="save-employee">${id ? "Guardar cambios" : "Registrar empleado"}</button><button class="btn outline" type="button" data-close>Cancelar</button></div></form>`,
    () =>
      (document.querySelector("#employee-form").onsubmit = async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.target)),
          button = document.querySelector("#save-employee"),
          error = document.querySelector("#dialog-error");
        if (data.password !== data.confirm) {
          error.innerHTML =
            '<div class="error">Las contraseñas no coinciden.</div>';
          return;
        }
        button.disabled = true;
        button.textContent = "Guardando…";
        try {
          await EmployeeStore.save(id, {
            ...data,
            active: data.active === "yes",
          });
          await syncData();
          render();
          toast(
            id
              ? "Datos del empleado actualizados."
              : "Empleado registrado. Ya puede iniciar sesión con su correo y contraseña.",
          );
        } catch (err) {
          error.innerHTML = `<div class="error">${esc(err.message)}</div>`;
          button.disabled = false;
          button.textContent = id ? "Guardar cambios" : "Registrar empleado";
        }
      }),
  );
}
