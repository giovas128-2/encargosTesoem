(async () => {
  const error = document.querySelector("#error"),
    button = document.querySelector("#submit");
  button.disabled = true;
  try {
    await EmployeeStore.init();
    if (EmployeeStore.current()) {
      location.replace("index.html#inicio");
      return;
    }
    button.disabled = false;
  } catch {
    error.textContent =
      "No fue posible preparar el acceso. Permite el almacenamiento del navegador y recarga la página.";
    return;
  }
  document.querySelector("#show-password").onclick = (e) => {
    const p = document.querySelector("#password"),
      show = p.type === "password";
    p.type = show ? "text" : "password";
    e.target.textContent = show ? "Ocultar" : "Mostrar";
    e.target.setAttribute(
      "aria-label",
      show ? "Ocultar contraseña" : "Mostrar contraseña",
    );
  };
  document.querySelectorAll("[data-demo]").forEach(
    (b) =>
      (b.onclick = () => {
        document.querySelector("#matricula").value = b.dataset.demo;
        document.querySelector("#password").value = "Demo2026";
      }),
  );
  document.querySelector("#login-form").onsubmit = async (e) => {
    e.preventDefault();
    button.disabled = true;
    button.textContent = "Ingresando…";
    error.textContent = "";
    try {
      const d = new FormData(e.target);
      if (await EmployeeStore.login(d.get("matricula"), d.get("password"))) {
        location.replace("index.html#inicio");
        return;
      }
      error.innerHTML =
        '<div class="error">Matrícula o contraseña incorrectas, o cuenta inactiva. Revisa tus datos o contacta al administrador.</div>';
    } catch {
      error.innerHTML =
        '<div class="error">No fue posible iniciar sesión. Inténtalo de nuevo.</div>';
    }
    button.disabled = false;
    button.textContent = "Iniciar sesión →";
  };
})();
