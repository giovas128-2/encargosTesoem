// Transporte HTTP. No reintenta escrituras y nunca utiliza mode: no-cors.
const ApiClient = (() => {
  async function request(action, values = {}, write = false) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);
    const url = new URL(API_CONFIG.url);
    const options = {
      method: write ? "POST" : "GET",
      signal: controller.signal,
      redirect: "follow",
      credentials: "omit",
    };
    if (write) {
      options.headers = { "Content-Type": API_CONFIG.postContentType };
      options.body = JSON.stringify({ ...values, accion: action });
    } else {
      url.searchParams.set("accion", action);
      Object.entries(values).forEach(([k, v]) =>
        url.searchParams.set(k, String(v)),
      );
    }
    try {
      const response = await fetch(url.toString(), options);
      if (!response.ok)
        throw Error(`La API respondió HTTP ${response.status}.`);
      let data;
      try {
        data = await response.json();
      } catch {
        throw Error(
          "La API no devolvió JSON. Revisa los permisos y la URL de implementación de Apps Script.",
        );
      }
      if (!data || data.ok !== true) {
        const error = new Error(
          typeof data?.error === "string"
            ? data.error
            : "El backend rechazó la operación.",
        );
        error.rejected = data?.ok === false;
        throw error;
      }
      return data;
    } catch (cause) {
      const error = new Error(
        cause.name === "AbortError"
          ? "La API tardó demasiado en responder."
          : cause instanceof TypeError
            ? "No fue posible conectar con la API. Revisa internet, los permisos de Apps Script y CORS."
            : cause.message,
      );
      // Una escritura puede haberse aplicado aun si se perdió la respuesta.
      error.uncertain = write && !cause.rejected;
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
