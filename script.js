const buttons = document.querySelectorAll('.access-btn');
const toast = document.getElementById('toast');

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    const product = button.dataset.product;
    toast.textContent = `${product} — acesso será conectado à Kiwify na próxima etapa.`;
    toast.classList.add('show');
    clearTimeout(window.__foxToastTimer);
    window.__foxToastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  });
});
