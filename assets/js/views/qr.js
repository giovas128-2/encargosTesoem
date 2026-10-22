// views/qr.js

function qr() {
  shell(
    `${heading("Registro presencial por QR", "Muestra el código al estudiante cuando se encuentre en la oficina.")}<div class="request-layout"><section class="panel"><div class="qr-pending">${icon("school")}<h2>Código de registro pendiente</h2><p class="muted">El código para registrar solicitudes estará disponible aquí<br>cuando la oficina lo habilite.</p><span class="demo">Todavía no hay un QR activo</span></div></section><section class="panel"><h2>Cómo registrar un préstamo</h2><div class="step"><span class="step-num">1</span><p>El estudiante llega a la oficina y escanea el QR.</p></div><div class="step"><span class="step-num">2</span><p>Escribe nombre, matrícula, correo, materiales, cantidades y fecha/hora de devolución.</p></div><div class="step"><span class="step-num">3</span><p>El empleado recibe la solicitud y confirma la entrega presencial.</p></div><a class="btn full" href="#simular">Registrar solicitud en la oficina ${icon("arrow")}</a><p class="muted" style="font-size:11px;margin:15px 0 0">También puedes registrar la solicitud aquí si el estudiante necesita ayuda con el formulario.</p></section></div>`,
  );
}
