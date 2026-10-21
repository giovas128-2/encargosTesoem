let syncError = "",
  syncBusy = false;
function render() {
  document.querySelectorAll(".dialog-backdrop").forEach((e) => e.remove());
  user = EmployeeStore.current();
  logged = !!user;
  if (!logged) {
    location.replace("login.html");
    return;
  }
  const r = route();
  if (r === "aceptados") { go("activos"); return; }
  if (
    ["pendientes", "aceptados", "activos", "vencidos", "historial"].includes(r)
  )
    listing(r);
  else
    (
      ({
        inicio: summary,
        panel: summary,
        inventario: inventory,
        qr,
        simular: simulate,
        empleados: employees,
      })[r] || summary
    )();
}
async function syncData({ quiet = false } = {}) {
  if (syncBusy || LoanStore.status().writing) return false;
  syncBusy = true;
  syncError = "";
  try {
    WhatsAppStore.reset();
    const task = LoanStore.refresh();
    if (!quiet) render();
    await task;
    const reminders = WhatsAppStore.refresh();
    if (!document.querySelector(".dialog-backdrop")) render();
    await reminders;
    if (!document.querySelector(".dialog-backdrop")) render();
    return true;
  } catch (err) {
    syncError = err.message;
    if (!document.querySelector(".dialog-backdrop")) render();
    return false;
  } finally {
    syncBusy = false;
  }
}
window.addEventListener("hashchange", () => {
  search = "";
  render();
  window.scrollTo(0, 0);
});
setInterval(() => {
  if (
    !document.hidden &&
    logged &&
    [
      "inicio",
      "pendientes",
      "aceptados",
      "activos",
      "vencidos",
      "historial",
      "inventario",
    ].includes(route()) &&
    !document.querySelector(".dialog-backdrop") &&
    !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)
  )
    syncData({ quiet: true });
}, API_CONFIG.pollMs);
EmployeeStore.init()
  .then(async () => {
    render();
    if (logged) await syncData();
  })
  .catch(() => location.replace("login.html"));
