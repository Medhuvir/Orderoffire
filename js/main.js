// Order of Fire — nav scroll-spy
// Highlights the current section's nav link as the reader scrolls the page.

const sections = document.querySelectorAll('section[id]');
const links = document.querySelectorAll('nav a');

const spy = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      links.forEach(l => l.classList.remove('active'));
      const active = document.querySelector(`nav a[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { rootMargin: '-45% 0px -50% 0px' });

sections.forEach(s => spy.observe(s));

// hamburger menu toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  links.forEach(link => link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }));
}

// nav: see-through over the hero, ivory record plate once the hero scrolls away
const topnav = document.getElementById('topnav');
const heroEl = document.querySelector('.hero');
if (topnav && heroEl) {
  new IntersectionObserver(([e]) => topnav.classList.toggle('solid', !e.isIntersecting), {
    rootMargin: '-75px 0px 0px 0px',
  }).observe(heroEl);
}

// photo bands: slow parallax on the image while the band crosses the screen
const bandImgs = document.querySelectorAll('.photo-band-img');
if (bandImgs.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let ticking = false;
  const drift = () => {
    ticking = false;
    bandImgs.forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      img.style.transform = `translate3d(0, ${(k * -6).toFixed(2)}%, 0)`;
    });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(drift); } }, { passive: true });
  drift();
}

// staggered scroll reveals, with the event page's brand easing.
// Each section's blocks rise into view; rows and grids reveal their items one by one.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  // once an item has risen, drop the reveal styles so its own hover transitions apply again
  const settle = e => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;
    const el = e.currentTarget;
    el.classList.remove('reveal', 'in');
    el.style.removeProperty('--d');
    el.removeEventListener('transitionend', settle);
  };

  const reveal = new IntersectionObserver(entries => {
    entries.forEach(e => {
      // reveal on entry, and also anything already scrolled past (e.g. after a nav jump)
      if (e.isIntersecting || e.boundingClientRect.top < 0) {
        e.target.addEventListener('transitionend', settle);
        e.target.classList.add('in');
        reveal.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px' });

  const mark = (el, i) => {
    el.classList.add('reveal');
    el.style.setProperty('--d', `${Math.min(i, 8) * 70}ms`);
    reveal.observe(el);
  };

  document.querySelectorAll('section[id]').forEach(section => {
    [...section.children].forEach(block => {
      const d = getComputedStyle(block).display;
      const isRow = block.children.length > 1 && !block.classList.contains('kicker') && /grid|flex/.test(d);
      if (isRow) [...block.children].forEach(mark);
      else mark(block, 0);
    });
  });
  document.querySelectorAll('.photo-band blockquote').forEach(q => mark(q, 0));
}
