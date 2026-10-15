// components/dialog.js

function dialog(html, bind) {
  const el = document.createElement("div"),
    previous = document.activeElement;
  el.className = "dialog-backdrop";
  el.innerHTML = `<section class="dialog" role="dialog" aria-modal="true" aria-label="Gestión del préstamo" tabindex="-1">${html}<div id="dialog-error" role="alert"></div></section>`;
  document.body.append(el);
  const close = () => {
    el.remove();
    previous?.focus();
  };
  el.querySelectorAll("[data-close]").forEach((b) => (b.onclick = close));
  el.onclick = (e) => {
    if (e.target === el) close();
  };
  el.onkeydown = (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Tab") {
      let a = [...el.querySelectorAll("button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]")];
      if (e.shiftKey && document.activeElement === a[0]) {
        e.preventDefault();
        a.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === a.at(-1)) {
        e.preventDefault();
        a[0].focus();
      }
    }
  };
  el.querySelector("input,textarea,button,.dialog").focus();
  bind?.();
}
