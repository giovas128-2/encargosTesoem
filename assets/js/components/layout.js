// components/layout.js

function shell(content) {
  const s = LoanStore.get(),
    unread = s.loans.filter((l) => l.status === "Pendiente" && !l.seen).length;
  document.querySelector("#app").innerHTML =
    `<aside class="sidebar"><a class="brand" href="#inicio"><span class="brandmark">${icon("school")}</span><div><strong>ADMIN</strong><small>CONTROL DE MATERIALES</small></div></a><div class="navlabel">OFICINA · ADMINISTRACIÓN</div><nav>${navs
      .filter(([r]) => r !== "empleados" || user?.role === "admin")
      .map(
        ([r, n, i]) =>
          `<a href="#${r}" class="${route() === r ? "active" : ""}" ${route() === r ? 'aria-current="page"' : ""}>${icon(i)}<span>${n}</span>${r === "pendientes" && unread ? `<b class="nav-count">${unread}</b>` : ""}</a>`,
      )
      .join(
        "",
      )}</nav><div class="sidefoot"><span class="demo">Al servicio de tu comunidad</span><p>Recibe, entrega y recupera.<br>Los recursos son de todos.</p></div></aside><div class="main"><header class="topbar"><div class="crumb">Servicios escolares &nbsp; / &nbsp; <b>Oficina de materiales</b></div><a href="#inicio" class="brand mobile-brand"><span class="brandmark">${icon("school")}</span><strong>ADMINISTRACIÓN</strong></a><div class="userarea">${
      logged
        ? `<button class="btn outline small" id="notifications" aria-label="${unread} solicitudes nuevas">${icon("list")} ${unread} nuevas</button><span class="avatar">${esc(
            user.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join(""),
          )}</span><div class="user-name">${esc(user.name)}<small>${user.role === "admin" ? "Administrador" : "Empleado"}</small></div><button id="logout" class="logout" aria-label="Cerrar sesión">${icon("exit")}</button>`
        : '<span class="demo">Acceso de empleados</span>'
    }</div></header><main class="content">${connectionBanner()}${content}<footer class="footer"><span>ADMINISTRACIÓN · Control de préstamos en oficina</span><span>${icon("shield")} Horario de Ciudad de México</span></footer></main></div>`;
  document.querySelector("#logout")?.addEventListener("click", async () => {
    try { await EmployeeStore.logout(); } catch {}
    location.replace("login.html");
  });
  document.querySelector("#notifications")?.addEventListener("click", () => {
    go("pendientes");
    if (route() === "pendientes") render();
  });
  document
    .querySelector("#refresh-api")
    ?.addEventListener("click", () => syncData());
}

const heading = (title, subtitle, action = "") =>
  `<div class="heading"><div><p class="eyebrow">CONTROL DE MATERIALES</p><h1>${title}</h1><p class="muted">${subtitle}</p></div>${action}</div>`;

const metric = (value, label, i, r) =>
  `<a href="#${r}" class="metric"><span class="iconbox">${icon(i)}</span><div><strong>${value}</strong><p>${label}</p></div></a>`;

const empty = (title, desc) =>
  `<div class="panel empty">${icon("list")}<h3>${title}</h3><p>${desc}</p></div>`;

function connectionBanner() {
  const st = LoanStore.status();
  return `<div class="connection-banner notice ${st.fresh ? "" : "warning"}" style="justify-content:space-between;align-items:center"><div><b>${st.fresh ? "Información actualizada" : st.syncing ? "Actualizando información…" : "Información pendiente de actualizar"}</b><br>${st.lastSync ? "Última actualización: " + fmt(st.lastSync) + ". " : ""}<small>Tus registros e historial se conservan al cerrar sesión.</small><div id="sync-error" role="alert">${esc(syncError)}</div></div><button class="btn outline small" id="refresh-api" ${st.syncing ? "disabled" : ""}>Actualizar</button></div>`;
}
