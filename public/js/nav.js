(() => {
  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('navMobileMenu');

  if (!burger || !menu) return;

  const toggle = () => {
    menu.classList.toggle('is-open');
  };

  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  document.addEventListener('click', (e) => {
    if (!menu.classList.contains('is-open')) return;
    if (!menu.contains(e.target) && e.target !== burger) {
      menu.classList.remove('is-open');
    }
  });
})();

