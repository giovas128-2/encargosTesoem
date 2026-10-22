// Transporte HTTP. No reintenta escrituras y nunca utiliza mode: no-cors.
const ApiClient = (() => {
  async function request(action, values = {}, write = false) {
    const url = new URL(API_CONFIG.url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);
    const options = {
      method: write ? "POST" : "GET",
      signal: controller.signal,
      redirect: "follow",
      credentials: "omit",
    };
    if (write) {
      options.headers = { "Content-Type": API_CONFIG.postContentType };
      options.body = JSON.stringify({ ...values, accion: action, ...(action !== "login" ? { token: EmployeeStore.token() } : {}) });
    } else {
      url.searchParams.set("accion", action);
      Object.entries(values).forEach(([k, v]) =>
        url.searchParams.set(k, String(v)),
      );
    }
    try {
      const response = await fetch(url.toString(), options);
      if (!response.ok)
        throw Error(`El servicio no está disponible en este momento (código ${response.status}). Inténtalo de nuevo.`);
      let data;
      try {
        data = await response.json();
      } catch {
        throw Error(
          "No pudimos leer la respuesta del servicio. Vuelve a intentarlo; si continúa, avisa al administrador.",
        );
      }
      if (!data || data.ok !== true) {
        const error = new Error(
          typeof data?.error === "string"
            ? data.error
            : "No se pudo completar la operación.",
        );
        error.rejected = data?.ok === false && data?.codigo !== 'RESULTADO_INCIERTO';
        if (['SESION_INVALIDA', 'SESION_EXPIRADA'].includes(data?.codigo)) {
          EmployeeStore.clear();
          if (!location.pathname.endsWith('login.html')) location.replace('login.html');
        }
        if (/acci[oó]n.*(no reconocida|desconocida)|unknown action/i.test(error.message)) error.message = action === 'recordatorios_whatsapp' ? 'Los avisos de WhatsApp todavía no están habilitados. Comunícate con el administrador.' : 'Esta función todavía no está habilitada. Comunícate con el administrador para activarla.';
        throw error;
      }
      return data;
    } catch (cause) {
      const error = new Error(
        cause.name === "AbortError"
          ? "La conexión está tardando más de lo esperado. Inténtalo de nuevo."
          : cause instanceof TypeError
            ? "No pudimos conectar con el servicio. Revisa tu conexión a internet; si continúa, avisa al administrador."
            : cause.message,
      );
      // Una escritura puede haberse aplicado aun si se perdió la respuesta.
      error.uncertain = write && action !== 'recordatorios_whatsapp' && !cause.rejected;
      if (error.uncertain)
        error.message +=
          " La acción podría haberse aplicado. Consulta de nuevo el préstamo antes de repetirla.";
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  return { get: (a, p) => request(a, p), post: (a, p) => request(a, p, true) };
})();
