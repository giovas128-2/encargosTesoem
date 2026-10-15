(async () => {
  const error = document.querySelector('#error'), button = document.querySelector('#submit');
  button.disabled = true;
  try { await EmployeeStore.init(); if (EmployeeStore.current()) { location.replace('index.html#inicio'); return; } }
  catch (e) { error.textContent = e.message; }
  button.disabled = false;
  document.querySelector('#show-password').onclick = e => {
    const p = document.querySelector('#password'), show = p.type === 'password';
    p.type = show ? 'text' : 'password'; e.target.textContent = show ? 'Ocultar' : 'Mostrar';
    e.target.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  };
  document.querySelector('#login-form').onsubmit = async e => {
    e.preventDefault(); button.disabled = true; button.textContent = 'Ingresando…'; error.textContent = '';
    const d = new FormData(e.target);
    try { await EmployeeStore.login(d.get('email'), d.get('password')); location.replace('index.html#inicio'); }
    catch(e) { error.textContent = e.message; }
    finally { document.querySelector('#password').value = ''; button.disabled = false; button.textContent = 'Iniciar sesión →'; }
  };
})();
