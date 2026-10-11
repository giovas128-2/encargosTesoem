// Configuración única del backend. El ID de encargado NO es una contraseña.
const API_CONFIG = Object.freeze({
  url: "https://script.google.com/macros/s/AKfycbwO4Q7-WKcVdizwkZxAdGTzzfGwP80OqKjVwEspAx4HObHyhFbeoU04Y98uC0RAryBf5A/exec",
  encargadoId: "USR-003", // Operador de integración documentado por Sebas.
  timeoutMs: 25000,
  pollMs: 45000,
  // JSON dentro de text/plain evita solicitar un preflight por application/json.
  // Apps Script debe analizar e.postData.contents independientemente del MIME.
  postContentType: "text/plain;charset=UTF-8",
});
