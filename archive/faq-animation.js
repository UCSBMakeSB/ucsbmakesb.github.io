const mascot = document.querySelector('.faq-mascot-art');

if (mascot) {
  const fish = mascot.querySelector('.faq-fish');
  const raisedWing = mascot.querySelector('.faq-wing-raised');
  const sideWing = mascot.querySelector('.faq-wing-side');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let timer;
  let smileTimer;
  let animations = [];

  const canAnimate = () => visible && !document.hidden && !reducedMotion.matches && !mascot.classList.contains('smiling');
  const stop = () => {
    clearTimeout(timer);
    animations.forEach(animation => animation.cancel());
    animations = [];
  };

  function animate(element, transforms, duration) {
    animations.push(element.animate(
      transforms.map(transform => ({ transform })),
      { duration, easing: 'ease-in-out' },
    ));
  }

  function escapeAndCatch() {
    if (!canAnimate()) return;
    stop();
    // Anticipation, a small leap, then a soft landing behind the holding wing.
    animate(fish, [
      'translateY(0) rotate(0deg)',
      'translateY(0) rotate(-7deg)',
      'translateY(0) rotate(6deg)',
      'translate(7px, -55px) rotate(-16deg)',
      'translate(4px, -38px) rotate(-5deg)',
      'translateY(3px) rotate(6deg)',
      'translateY(0) rotate(0deg)',
    ], 2200);
    animate(raisedWing, [
      'rotate(0deg)', 'rotate(0deg)', 'rotate(2deg)',
      'rotate(-8deg)', 'rotate(-12deg)', 'rotate(3deg)', 'rotate(0deg)',
    ], 2200);
    animate(sideWing, [
      'rotate(0deg)', 'rotate(0deg)', 'rotate(0deg)',
      'rotate(12deg)', 'rotate(-3deg)', 'rotate(4deg)', 'rotate(0deg)',
    ], 2200);
    timer = setTimeout(escapeAndCatch, 12000);
  }

  function resume() {
    stop();
    clearTimeout(smileTimer);
    mascot.classList.remove('smiling');
    if (canAnimate()) timer = setTimeout(escapeAndCatch, 3500);
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    resume();
  }, { threshold: 0.25 }).observe(mascot);
  document.addEventListener('visibilitychange', resume);
  reducedMotion.addEventListener('change', resume);

  document.querySelectorAll('#faqs details').forEach(question => {
    question.addEventListener('toggle', () => {
      if (!question.open || !visible || document.hidden) return;
      stop();
      clearTimeout(smileTimer);
      mascot.classList.add('smiling');
      if (!reducedMotion.matches) {
        animate(sideWing, [
          'rotate(0deg)', 'rotate(14deg)', 'rotate(9deg)',
          'rotate(14deg)', 'rotate(0deg)',
        ], 1000);
      }
      smileTimer = setTimeout(() => {
        mascot.classList.remove('smiling');
        if (canAnimate()) timer = setTimeout(escapeAndCatch, 12000);
      }, 1600);
    });
  });
}
