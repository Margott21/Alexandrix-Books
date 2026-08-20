// Alexandrix Books — barra de navegação arrastável na lateral
(function () {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  nav.classList.add('drag-scroll');

  let down = false, startX = 0, startScroll = 0, moved = false;

  nav.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    down = true; moved = false;
    startX = e.clientX;
    startScroll = nav.scrollLeft;
    nav.classList.add('dragging');
  });

  nav.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    nav.scrollLeft = startScroll - dx;
  });

  const end = () => { down = false; nav.classList.remove('dragging'); };
  nav.addEventListener('pointerup', end);
  nav.addEventListener('pointerleave', end);
  nav.addEventListener('pointercancel', end);

  // evita navegar quando o usuário só arrastou
  nav.addEventListener('click', (e) => {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);
