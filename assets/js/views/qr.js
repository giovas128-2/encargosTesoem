// assets/js/views/qr.js

function qr() {
  const formulario =
    "https://docs.google.com/forms/d/e/1FAIpQLSekbz4M0_3t2Dh5Wtb5mOErNsHGo3YQ4YCsNJwSGSQICjKisA/viewform?usp=preview";

  shell(`
    ${heading(
      "Registro presencial por QR",
      "Muestra el código al estudiante cuando se encuentre en la oficina."
    )}

    <div class="request-layout">
      <section class="panel">
        <div class="qr-pending">
          <h2>Escanea para solicitar material</h2>

          <p class="muted">
            Abre la cámara de tu celular y apunta al código.
          </p>

          <img
            src="../assets/img/qr-formulario.png"
            alt="Código QR para abrir el formulario de solicitud de materiales"
            width="320"
            height="320"
            style="
              display: block;
              width: 100%;
              max-width: 320px;
              height: auto;
              margin: 20px auto;
            "
          >

          <a
            class="btn"
            href="${formulario}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir formulario ${icon("arrow")}
          </a>

          <p class="muted">
            Al terminar, avisa al encargado para revisar tu solicitud.
          </p>
        </div>
      </section>

      <section class="panel">
        <h2>Cómo registrar un préstamo</h2>

        <div class="step">
          <span class="step-num">1</span>
          <p>El estudiante llega a la oficina y escanea el QR.</p>
        </div>

        <div class="step">
          <span class="step-num">2</span>
          <p>
            Escribe nombre, matrícula, correo, materiales,
            cantidades y fecha/hora de devolución.
          </p>
        </div>

        <div class="step">
          <span class="step-num">3</span>
          <p>
            El empleado recibe la solicitud y confirma
            la entrega presencial.
          </p>
        </div>

        <a class="btn full" href="#simular">
          Registrar solicitud en la oficina ${icon("arrow")}
        </a>

        <p
          class="muted"
          style="font-size: 11px; margin: 15px 0 0;"
        >
          También puedes registrar la solicitud aquí si el
          estudiante necesita ayuda con el formulario.
        </p>
      </section>
    </div>
  `);
}