/* Simulación local de cuentas. La autorización real será responsabilidad del backend. */
const EmployeeStore = (() => {
  const key = "tesoem-employees-v1",
    sessionKey = "tesoem-employee-session";
  const read = () => JSON.parse(localStorage.getItem(key) || "[]");
  const write = (a) => localStorage.setItem(key, JSON.stringify(a));
  const clean = ({ hash, salt, ...e }) => e;
  async function secret(password, salt) {
    const k = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    const bytes = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: new TextEncoder().encode(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      k,
      256,
    );
    return Array.from(new Uint8Array(bytes), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  }
  async function credentials(password) {
    let salt = crypto.randomUUID();
    return { salt, hash: await secret(password, salt) };
  }
  const current = () => {
    try {
      const s = JSON.parse(sessionStorage.getItem(sessionKey));
      return (
        read().find(
          (e) => e.id === s?.id && e.revision === s.revision && e.active,
        ) || null
      );
    } catch {
      return null;
    }
  };
  const requireAdmin = () => {
    if (current()?.role !== "admin")
      throw Error("Solo el administrador puede gestionar empleados.");
  };
  return {
    init: async () => {
      if (localStorage.getItem(key)) return;
      const pw = await credentials("Demo2026");
      write([
        {
          id: "employee-admin",
          name: "Administrador TESOEM",
          matricula: "encargada",
          email: "admin@example.com",
          area: "Oficina de materiales",
          phone: "",
          role: "admin",
          active: true,
          revision: 1,
          created: new Date().toISOString(),
          ...pw,
        },
        {
          id: "employee-002",
          name: "Laura Martínez",
          matricula: "EMP002",
          email: "laura@example.com",
          area: "Servicios escolares",
          phone: "",
          role: "employee",
          active: true,
          revision: 1,
          created: new Date().toISOString(),
          ...(await credentials("Demo2026")),
        },
      ]);
    },
    current: () => {
      let u = current();
      return u ? clean(u) : null;
    },
    list: () => {
      requireAdmin();
      return read().map(clean);
    },
    login: async (m, p) => {
      let u = read().find(
        (e) => e.matricula.toLowerCase() === m.trim().toLowerCase() && e.active,
      );
      if (!u || (await secret(p, u.salt)) !== u.hash) return false;
      sessionStorage.setItem(
        sessionKey,
        JSON.stringify({ id: u.id, revision: u.revision }),
      );
      return true;
    },
    logout: () => sessionStorage.removeItem(sessionKey),
    save: async (id, data) => {
      requireAdmin();
      const actor = current();
      let all = read(),
        old = all.find((e) => e.id === id);
      if (id && !old) throw Error("Empleado no encontrado.");
      const d = {
        name: data.name.trim(),
        matricula: data.matricula.trim(),
        email: data.email.trim(),
        area: data.area.trim(),
        phone: data.phone.trim(),
        role: data.role,
        active: data.active,
      };
      if (
        !d.name ||
        !d.area ||
        !/^\S+@\S+\.\S+$/.test(d.email) ||
        !/^[a-zA-Z0-9_-]{3,30}$/.test(d.matricula)
      )
        throw Error(
          "Revisa los datos. La matrícula debe tener entre 3 y 30 letras, números, guiones o guiones bajos.",
        );
      if (!["admin", "employee"].includes(d.role)) throw Error("Rol inválido.");
      if (
        all.some(
          (e) =>
            e.id !== id &&
            e.matricula.toLowerCase() === d.matricula.toLowerCase(),
        )
      )
        throw Error("Ya existe un empleado con esa matrícula.");
      if (!old && !data.password)
        throw Error("Define una contraseña para el nuevo empleado.");
      if (data.password && data.password.length < 8)
        throw Error("La contraseña debe tener al menos 8 caracteres.");
      if (id === actor.id && (!d.active || d.role !== "admin"))
        throw Error(
          "No puedes desactivar tu propia cuenta ni quitarte el rol de administrador.",
        );
      const updated = {
        ...old,
        ...d,
        id: old?.id || crypto.randomUUID(),
        created: old?.created || new Date().toISOString(),
        revision: old?.revision || 1,
      };
      if (data.password) {
        Object.assign(updated, await credentials(data.password));
        updated.revision++;
      }
      requireAdmin();
      if (old) all = all.map((e) => (e.id === id ? updated : e));
      else all.push(updated);
      write(all);
      if (id === actor.id)
        sessionStorage.setItem(
          sessionKey,
          JSON.stringify({ id, revision: updated.revision }),
        );
      return clean(updated);
    },
    remove: (id) => {
      requireAdmin();
      const actor = current(),
        all = read();
      if (id === actor.id)
        throw Error(
          "No puedes eliminar la cuenta con la que estás trabajando.",
        );
      const target = all.find((e) => e.id === id);
      if (!target) throw Error("Empleado no encontrado.");
      if (
        target.role === "admin" &&
        target.active &&
        all.filter((e) => e.role === "admin" && e.active).length <= 1
      )
        throw Error("Debe existir al menos un administrador activo.");
      write(all.filter((e) => e.id !== id));
    },
  };
})();
