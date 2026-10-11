const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = (p) => fs.readFileSync(path.join(root, "assets/js", p), "utf8");
async function transportTests() {
  let call,
    response = { ok: true, materiales: [] };
  const ctx = {
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch: async (url, options) => {
      call = { url, options };
      return { ok: true, json: async () => response };
    },
  };
  vm.createContext(ctx);
  vm.runInContext(
    source("config/api-config.js") +
      source("services/api-client.js") +
      ";globalThis.client=ApiClient;",
    ctx,
  );
  await ctx.client.get("prestamos_usuario", { matricula: "2024 A&1" });
  assert.equal(new URL(call.url).searchParams.get("matricula"), "2024 A&1");
  await ctx.client.post("aceptar_solicitud", {
    prestamo_id: "P1",
    encargado_id: "USR-003",
  });
  assert.equal(call.options.method, "POST");
  assert.equal(
    call.options.headers["Content-Type"],
    "text/plain;charset=UTF-8",
  );
  assert.equal(JSON.parse(call.options.body).accion, "aceptar_solicitud");
  assert.equal(call.options.mode, undefined);
  response = { ok: false, error: "Sin existencia" };
  await assert.rejects(
    ctx.client.post("aceptar_solicitud", {}),
    (e) => !e.uncertain && e.message === "Sin existencia",
  );
  ctx.fetch = async () => {
    throw new TypeError("Network error");
  };
  await assert.rejects(
    ctx.client.post("registrar_devolucion", {}),
    (e) => e.uncertain === true,
  );
  ctx.fetch = async () => ({
    ok: true,
    json: async () => {
      throw Error("HTML");
    },
  });
  await assert.rejects(ctx.client.get("materiales"), /JSON/);
}
async function lifecycleTests() {
  const m = {
    id: "MAT-001",
    nombre: "HDMI",
    categoria: "Cables",
    existencia_total: 10,
    existencia_disponible: 10,
    limite_por_solicitud: 3,
    activo: true,
  };
  const l = {
    id: "P1",
    matricula: "2024001",
    nombre: "Alumno <test>",
    telefono: "5512345678",
    estado: "pendiente",
    fecha_solicitud: new Date().toISOString(),
    fecha_limite: new Date(Date.now() + 3600000).toISOString(),
    detalles: [
      {
        material_id: "MAT-001",
        material: "HDMI",
        cantidad_solicitada: 2,
        cantidad_entregada: 0,
        cantidad_devuelta: 0,
      },
    ],
  };
  let posts = [],
    fail = false,
    missing = false;
  const ctx = {
    Date,
    Intl,
    structuredClone,
    API_CONFIG: { encargadoId: "USR-003" },
    ApiClient: {
      get: async (a, p) => {
        if (fail) throw Error("No disponible");
        if (a === "materiales") return structuredClone({ materiales: [m] });
        if (a === "prestamos_pendientes") {
          const { detalles, ...header } = l;
          return {
            prestamos:
              l.estado === "pendiente" ? [structuredClone(header)] : [],
          };
        }
        if (a === "prestamos_usuario") {
          assert.equal(p.matricula, "2024001");
          const value = structuredClone(l);
          if (missing) delete value.detalles;
          return { prestamos: [value] };
        }
        throw Error("Unexpected GET");
      },
      post: async (a, p) => {
        posts.push({ a, p });
        if (a === "aceptar_solicitud") {
          l.estado = "aceptado";
          m.existencia_disponible -= 2;
        } else if (a === "registrar_entrega") {
          l.estado = "entregado";
          l.detalles[0].cantidad_entregada = 2;
        } else if (a === "registrar_devolucion") {
          l.detalles[0].cantidad_devuelta += p.cantidad;
          m.existencia_disponible += p.cantidad;
          l.estado =
            l.detalles[0].cantidad_devuelta === 2 ? "devuelto" : "parcial";
        }
        return { ok: true, estado: l.estado };
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(
    source("services/loan-service.js") + ";globalThis.store=LoanStore;",
    ctx,
  );
  const s = ctx.store;
  await s.refresh();
  assert(s.get().loans[0].hasDetails);
  assert.equal(s.get().materials[0].available, 10);
  assert.equal(s.get().loans.length, 1);
  await s.act("P1", "accept");
  assert.equal(posts[0].p.encargado_id, "USR-003");
  assert.equal(
    s.get().materials[0].available,
    10,
    "No optimistic inventory edits",
  );
  assert.equal(s.status().fresh, false);
  await assert.rejects(s.act("P1", "accept"), /Actualiza/);
  await s.refresh();
  assert.equal(s.get().loans[0].status, "Aceptado");
  assert.equal(s.get().materials[0].available, 8);
  await s.act("P1", "deliver");
  await s.refresh();
  assert.equal(s.get().materials[0].available, 8);
  assert.equal(s.get().loans[0].status, "Entregado");
  await assert.rejects(
    s.act("P1", "return", { material_id: "MAT-001", cantidad: 3 }),
  );
  await s.act("P1", "return", { material_id: "MAT-001", cantidad: 1 });
  assert.equal(posts.at(-1).p.material_id, "MAT-001");
  assert.equal(posts.at(-1).p.cantidad, 1);
  await s.refresh();
  assert.equal(s.get().loans[0].status, "Parcialmente devuelto");
  assert.equal(s.get().materials[0].available, 9);
  l.fecha_limite = new Date(Date.now() - 60000).toISOString();
  await s.refresh();
  assert(s.overdue(s.get().loans[0]));
  await s.act("P1", "return", { material_id: "MAT-001", cantidad: 1 });
  await s.refresh();
  assert.equal(s.get().loans[0].status, "Devuelto");
  assert.equal(s.get().materials[0].available, 10);
  assert(!s.overdue(s.get().loans[0]));
  fail = true;
  await assert.rejects(s.refresh());
  assert.equal(s.status().fresh, false);
  assert.equal(
    s.get().materials[0].available,
    10,
    "Preserve prior snapshot but mark stale",
  );
  fail = false;
  l.estado = "pendiente";
  missing = true;
  await s.refresh();
  assert.equal(s.get().loans[0].hasDetails, false);
  await assert.rejects(s.act("P1", "accept"), /detalles/);
  missing = false;
  await s.refresh();
  ctx.ApiClient.post = async () => {
    let e = Error("Respuesta perdida");
    e.uncertain = true;
    throw e;
  };
  await assert.rejects(s.act("P1", "accept"));
  assert(s.status().writeBlocked);
  assert(!s.status().fresh);
  console.log(
    "PASS: GET/POST, errores, lectura completa por matrícula, no doble descuento, aceptación/entrega separadas, devoluciones parciales, cantidades, vencimientos, datos incompletos y resultado incierto. Sin escrituras de red.",
  );
}
(async () => {
  await transportTests();
  await lifecycleTests();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
