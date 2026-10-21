// components/notifications.js

function toast(s) {
  const t = document.querySelector("#toast");
  t.textContent = s;
  t.style.display = "block";
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => (t.style.display = "none"), 4500);
}
const navs = [
  ["inicio", "Resumen", "home"],
  ["pendientes", "Solicitudes", "list"],
  ["activos", "Préstamos activos", "box"],
  ["vencidos", "Vencidos", "clock"],
  ["inventario", "Inventario", "grid"],
  ["historial", "Historial", "check"],
  ["qr", "QR de registro", "school"],
  ["empleados", "Empleados", "shield"],
];
