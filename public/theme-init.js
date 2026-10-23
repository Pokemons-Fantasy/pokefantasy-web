// Aplica el tema claro antes del primer pintado (sin parpadeo). Lo carga index.html de forma síncrona.
try {
  if (localStorage.getItem('pf-theme') === 'light') {
    document.documentElement.classList.add('theme-light');
  }
} catch {
  // Sin acceso a localStorage (modo privado estricto): se queda el tema oscuro.
}
