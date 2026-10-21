const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  box: '<path d="m3 7 9-4 9 4v11l-9 4-9-4zM3 7l9 4 9-4M12 11v11M7 5l10 4"/>',
  list: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  shield:
    '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6z"/><path d="m8 12 3 3 5-6"/>',
  exit: '<path d="M9 3H4v18h5M10 12h11m-4-4 4 4-4 4"/>',
  school: '<path d="m2 9 10-6 10 6-10 6zM6 12v6q6 5 12 0v-6M22 9v9"/>',
  cable:
    '<path d="M7 8V5h4v6H5V8zM17 17v3h-4v-6h6v3zM8 11v3c0 3 8-4 8 0M8 5V3m2 2V3m4 17v2m2-2v2"/>',
  projector:
    '<rect x="2" y="7" width="20" height="11" rx="3"/><circle cx="16" cy="12.5" r="3"/><path d="M5 11h4m-4 3h4M6 18v2m12-2v2"/>',
  plug: '<rect x="5" y="7" width="14" height="10" rx="3"/><circle cx="9" cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/><path d="M12 17v3c0 3 9 3 9-2V6q0-3-3-3h-4M14 2v2"/>',
  usb: '<rect x="4" y="9" width="10" height="9" rx="2"/><path d="M7 12h4m-4 3h4M14 13h3q4 0 4-4V6h-4V2h5v4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
};
const icon = (n) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[n] || paths.box}</svg>`;
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
// Estado de la interfaz; los servicios de datos se cargan antes que este archivo.
let user = EmployeeStore.current(),
  logged = !!user,
  search = "";
const route = () => location.hash.slice(1) || "inicio";
const go = (r) => (location.hash = r);
const fmt = (s) =>
  !s || !Number.isFinite(Date.parse(s))
    ? "Sin fecha"
    : new Date(s).toLocaleString("es-MX", {
        timeZone: "America/Mexico_City",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
const badge = (s) =>
  `<span class="badge ${{ Pendiente: "pending", Aceptado: "pending", Entregado: "delivered", "Parcialmente devuelto": "partial", Devuelto: "done", Rechazado: "overdue" }[s] || ""}">${esc(s)}</span>`;
