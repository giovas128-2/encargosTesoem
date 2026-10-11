// views/qr.js

function qr() {
  shell(
    `${heading("Registro presencial por QR", "Muestra el código al estudiante cuando se encuentre en la oficina.")}<div class="request-layout"><section class="panel"><div class="qr-pending">${icon("school")}<h2>Google Forms pendiente</h2><p class="muted">Aquí aparecerá el QR del formulario de registro<br>cuando Sebas comparta su enlace.</p><span class="demo">Todavía no hay un QR activo</span></div></section><section class="panel"><h2>Así será el registro</h2><div class="step"><span class="step-num">1</span><p>El estudiante llega a la oficina y escanea el QR.</p></div><div class="step"><span class="step-num">2</span><p>Escribe nombre, matrícula, correo, materiales, cantidades y fecha/hora de devolución.</p></div><div class="step"><span class="step-num">3</span><p>El empleado recibe la solicitud y confirma la entrega presencial.</p></div><a class="btn full" href="#simular">Abrir registro manual por API ${icon("arrow")}</a><p class="muted" style="font-size:11px;margin:15px 0 0">El registro manual crea solicitudes reales en Sheets. No reemplaza el QR de Google Forms.</p></section></div>`,
  );
}
