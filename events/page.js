// Order of Fire — Event page behaviour: nav, reveals, countdown, ticker.

// nav turns into the ivory record plate once you leave the hero
const nav = document.querySelector('nav.topnav');
const hero = document.querySelector('.hero');
if (nav && hero) {
  new IntersectionObserver(([e]) => nav.classList.toggle('solid', !e.isIntersecting), {
    rootMargin: '-72px 0px 0px 0px',
  }).observe(hero);
}

const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}

// staggered scroll reveals
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { rootMargin: '0px 0px -12% 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// countdown — reads data-date (ISO 8601 with offset) from .countdown
const cd = document.querySelector('[data-countdown]');
if (cd) {
  const target = new Date(cd.dataset.countdown).getTime();
  const out = {
    d: cd.querySelector('[data-unit=d]'), h: cd.querySelector('[data-unit=h]'),
    m: cd.querySelector('[data-unit=m]'), s: cd.querySelector('[data-unit=s]'),
  };
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    let diff = Math.max(0, target - Date.now());
    const d = Math.floor(diff / 864e5); diff -= d * 864e5;
    const h = Math.floor(diff / 36e5); diff -= h * 36e5;
    const m = Math.floor(diff / 6e4); diff -= m * 6e4;
    const s = Math.floor(diff / 1e3);
    out.d.textContent = pad(d); out.h.textContent = pad(h);
    out.m.textContent = pad(m); out.s.textContent = pad(s);
  };
  tick();
  setInterval(tick, 1000);
}

// ticker: duplicate the track content so the marquee loops seamlessly
document.querySelectorAll('.ticker-track').forEach(track => {
  track.innerHTML += track.innerHTML;
});

// photo band parallax
const band = document.querySelector('.photo-band-img');
if (band && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const onScroll = () => {
    const r = band.parentElement.getBoundingClientRect();
    const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    band.style.transform = `translate3d(0, ${(k * -6).toFixed(2)}%, 0)`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
