// Adaptador remoto. Las existencias solo cambian como resultado de la API.
const LoanStore = (() => {
  let state = { materials: [], loans: [] },
    known = new Set(),
    lastSync = null;
  let fresh = false,
    syncing = null,
    writing = false,
    writeBlocked = false;
  const states = {
    pendiente: "Pendiente",
    aceptado: "Aceptado",
    entregado: "Entregado",
    parcial: "Parcialmente devuelto",
    devuelto: "Devuelto",
    rechazado: "Rechazado",
  };
  const integer = (n) => {
    n = Number(n);
    if (!Number.isInteger(n) || n < 0)
      throw Error("La API devolvió una cantidad inválida.");
    return n;
  };
  const loan = (l) => {
    if (!l.id || !l.matricula || !states[l.estado])
      throw Error("Formato de préstamo inesperado en la API.");
    return {
      id: String(l.id),
      user: String(l.matricula),
      name: String(l.nombre || ""),
      phone: String(l.telefono || ""),
      email: l.correo || "",
      status: states[l.estado],
      created: l.fecha_solicitud,
      due: l.fecha_limite,
      reason: String(l.motivo || ""),
      seen: false,
      hasDetails: Array.isArray(l.detalles) && l.detalles.length > 0,
      items: (Array.isArray(l.detalles) ? l.detalles : []).map((i) => ({
        id: String(i.material_id),
        name: String(i.material || i.material_id),
        qty: integer(i.cantidad_solicitada),
        delivered: integer(i.cantidad_entregada),
        returned: integer(i.cantidad_devuelta),
      })),
    };
  };
  const material = (m) => ({
    id: String(m.id),
    name: String(m.nombre),
    category: String(m.categoria || "Material"),
    total: integer(m.existencia_total),
    available: integer(m.existencia_disponible),
    max: integer(m.limite_por_solicitud),
    active: m.activo === true || String(m.activo).toLowerCase() === "true",
    icon:
      {
        "MAT-001": "cable",
        "MAT-002": "projector",
        "MAT-003": "plug",
        "MAT-004": "usb",
      }[m.id] || "box",
  });
  const array = (v) => {
    if (!Array.isArray(v)) throw Error("La API devolvió una lista inválida.");
    return v;
  };
  const active = (l) =>
    ["Entregado", "Parcialmente devuelto"].includes(l.status);
  const overdue = (l) =>
    active(l) &&
    Number.isFinite(Date.parse(l.due)) &&
    Date.parse(l.due) < Date.now();
  async function refresh() {
    if (syncing) return syncing;
    syncing = (async () => {
      fresh = false;
      const [materials, pending] = await Promise.all([
        ApiClient.get("materiales"),
        ApiClient.get("prestamos_pendientes"),
      ]);
      const pendingLoans = array(pending.prestamos).map(loan);
      const next = new Map(pendingLoans.map((l) => [l.id, l]));
      // Solo alumnos conocidos en esta sesión. No hay endpoint de listado global.
      const ids = new Set([...known, ...pendingLoans.map((l) => l.user)]);
      for (const id of ids) {
        const d = await ApiClient.get("prestamos_usuario", { matricula: id });
        array(d.prestamos)
          .map(loan)
          .forEach((l) => next.set(l.id, l));
      }
      state = {
        materials: array(materials.materiales).map(material),
        loans: [...next.values()].sort(
          (a, b) => Date.parse(b.created) - Date.parse(a.created),
        ),
      };
      known = ids;
      fresh = true;
      writeBlocked = false;
      lastSync = new Date().toISOString();
      return structuredClone(state);
    })();
    try {
      return await syncing;
    } finally {
      syncing = null;
    }
  }
  async function lookup(id) {
    id = id.trim();
    if (!id) throw Error("Escribe una matrícula.");
    const d = await ApiClient.get("prestamos_usuario", { matricula: id });
    const loans = array(d.prestamos).map(loan);
    known.add(id);
    state.loans = state.loans.filter((l) => l.user !== id).concat(loans);
    return loans.length;
  }
  async function mutate(action, values) {
    if (!fresh || writeBlocked)
      throw Error("Actualiza los datos antes de realizar otra operación.");
    if (writing || syncing)
      throw Error("Espera a que termine la operación en curso.");
    writing = true;
    try {
      const data = await ApiClient.post(action, values);
      // Una respuesta exitosa sigue requiriendo consultar el estado autoritativo.
      fresh = false;
      return data;
    } catch (e) {
      if (e.uncertain) {
        writeBlocked = true;
        fresh = false;
      }
      throw e;
    } finally {
      writing = false;
    }
  }
  return {
    get: () => structuredClone(state),
    active,
    overdue,
    refresh,
    lookup,
    status: () => ({
      fresh,
      writing,
      syncing: !!syncing,
      writeBlocked,
      lastSync,
      knownCount: known.size,
    }),
    localDateTime: (iso = new Date().toISOString()) => {
      const p = Object.fromEntries(
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Mexico_City",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        })
          .formatToParts(new Date(iso))
          .map((x) => [x.type, x.value]),
      );
      return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
    },
    create: async (data) => {
      const result = await mutate("crear_solicitud", data);
      known.add(data.matricula);
      return result;
    },
    act: async (id, action, data = {}) => {
      const l = state.loans.find((l) => l.id === id);
      if (!l)
        throw Error("Consulta el préstamo antes de realizar esta acción.");
      if (action !== "reject" && !l.hasDetails)
        throw Error(
          "La API no devolvió los detalles del material. No se puede confirmar esta operación hasta que el backend incluya detalles.",
        );
      const map = {
        accept: "aceptar_solicitud",
        reject: "rechazar_solicitud",
        deliver: "registrar_entrega",
        return: "registrar_devolucion",
      };
      if (!map[action]) throw Error("Acción desconocida.");
      if (
        (["accept", "reject"].includes(action) && l.status !== "Pendiente") ||
        (action === "deliver" && l.status !== "Aceptado") ||
        (action === "return" && !active(l))
      )
        throw Error(
          "El estado del préstamo no permite esa acción. Actualiza los datos.",
        );
      const payload = { prestamo_id: id, encargado_id: API_CONFIG.encargadoId };
      if (action === "return") {
        const item = l.items.find((i) => i.id === data.material_id);
        const n = Number(data.cantidad);
        if (
          !item ||
          !Number.isInteger(n) ||
          n < 1 ||
          n > item.delivered - item.returned
        )
          throw Error("Revisa el material y la cantidad que estás recibiendo.");
        Object.assign(payload, { material_id: item.id, cantidad: n });
      }
      known.add(l.user);
      return mutate(map[action], payload);
    },
  };
})();
