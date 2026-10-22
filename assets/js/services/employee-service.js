// La contraseña nunca se almacena en el navegador. El backend autoriza cada acción.
const EmployeeStore = (() => {
  const key = 'tesoem-session-v2';
  let session = null, people = [];
  try { session = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch {}
  function clear() { session = null; people = []; sessionStorage.removeItem(key); }
  function current() {
    if (!session || !Number.isFinite(Date.parse(session.expires)) || Date.parse(session.expires) <= Date.now()) return null;
    return structuredClone(session.user);
  }
  function employee(u) {
    const role = String(u.rol || '').toLowerCase();
    if (!u.id || !['admin','administrador','encargada','encargado','empleado'].includes(role)) throw Error('La cuenta no tiene acceso a la oficina.');
    return { id: String(u.id), name: String(u.nombre || ''), matricula: String(u.matricula || ''), email: String(u.correo || ''), phone: String(u.telefono || ''), role: ['admin','administrador'].includes(role) ? 'admin' : 'employee', active: u.activo === true, area: 'Oficina de materiales' };
  }
  async function init() {
    if (!current()) { clear(); return; }
    try {
      const data = await ApiClient.post('sesion');
      session.user = employee(data.usuario);
      if (!session.user.active) throw Error('Cuenta inactiva.');
      sessionStorage.setItem(key, JSON.stringify(session));
    } catch (e) { clear(); throw e; }
  }
  return {
    init, current,
    token: () => current() ? session.token : '',
    login: async (correo, password) => {
      clear();
      const d = await ApiClient.post('login', { correo: String(correo).trim(), password });
      const u = employee(d.usuario);
      if (!u.active || !d.token || !Number.isFinite(Date.parse(d.expira)) || Date.parse(d.expira) <= Date.now()) throw Error('No pudimos iniciar tu sesión. Vuelve a intentarlo.');
      session = { token: d.token, expires: d.expira, user: u };
      sessionStorage.setItem(key, JSON.stringify(session));
      return true;
    },
    logout: async () => { try { if (current()) await ApiClient.post('logout'); } finally { clear(); } },
    clear,
    list: () => structuredClone(people),
    setList: (rows) => { people = (rows || []).map(employee); },
    save: async (id, data) => {
      if (current()?.role !== 'admin') throw Error('Solo el administrador puede gestionar empleados.');
      await ApiClient.post('guardar_empleado', { operacion_id: crypto.randomUUID(), usuario_id: id || null, nombre: data.name, matricula: data.matricula, correo: data.email, telefono: data.phone, rol: data.role === 'admin' ? 'admin' : 'encargada', activo: data.active, ...(data.password ? {password: data.password} : {}) });
    },
    remove: async (id) => {
      if (current()?.role !== 'admin' || id === current().id) throw Error('No puedes eliminar esta cuenta.');
      await ApiClient.post('eliminar_empleado', { operacion_id: crypto.randomUUID(), usuario_id: id });
    },
  };
})();
