/* WitNest – UI + Features
   - JokeAPI fetch by category / search
   - Typewriter effect
   - Favorites (localStorage)
   - Reactions (persisted)
   - Copy / Share
   - Auto mode (interval)
   - Dark mode
*/

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Elements
const jokeEl = $('#joke');
const categoryEl = $('#joke-category');
const searchEl = $('#joke-search');
const generateBtn = $('#generate-joke');
const searchBtn = $('#search-joke');
const saveBtn = $('#save-joke');
const copyBtn = $('#copy-joke');
const shareBtn = $('#share-joke');
const autoBtn = $('#auto-toggle');
const autoSecondsEl = $('#auto-seconds');

const countLol = $('#count-lol');
const countMeh = $('#count-meh');
const countBoo = $('#count-boo');

const favOpen = $('#favorites-open');
const favSection = $('#favorites-section');
const favList = $('#favorites-list');
const favClear = $('#favorites-clear');

const aboutOpen = $('#about-open');
const aboutSection = $('#about-section');

const darkToggle = $('#dark-toggle');

let autoTimer = null;
let isTyping = false;

// State
let favorites = JSON.parse(localStorage.getItem('wn_favorites') || '[]');
let reactionsMap = JSON.parse(localStorage.getItem('wn_reactions') || '{}'); // { jokeTextHash: {lol,meh,boo} }

// Utils
const hash = (s) => {
  let h = 0, i, chr;
  if (s.length === 0) return h;
  for (i = 0; i < s.length; i++) {
    chr = s.charCodeAt(i);
    h = ((h << 5) - h) + chr;
    h |= 0;
  }
  return String(h);
};

const setCountsForJoke = (text) => {
  const id = hash(text);
  const rec = reactionsMap[id] || { lol: 0, meh: 0, boo: 0 };
  countLol.textContent = rec.lol;
  countMeh.textContent = rec.meh;
  countBoo.textContent = rec.boo;
};

const updateReaction = (type) => {
  const text = jokeEl.textContent.trim();
  if (!text) return;
  const id = hash(text);
  const rec = reactionsMap[id] || { lol: 0, meh: 0, boo: 0 };
  rec[type] = (rec[type] || 0) + 1;
  reactionsMap[id] = rec;
  localStorage.setItem('wn_reactions', JSON.stringify(reactionsMap));
  setCountsForJoke(text);
};

// Typewriter
const typeWriter = (text, speed = 18) => {
  isTyping = true;
  jokeEl.classList.add('typing');
  jokeEl.textContent = '';
  let i = 0;
  const timer = setInterval(() => {
    if (i >= text.length) {
      clearInterval(timer);
      jokeEl.classList.remove('typing');
      isTyping = false;
      return;
    }
    jokeEl.textContent += text[i++];
  }, speed);
};

// JokeAPI
const API_BASE = 'https://v2.jokeapi.dev/joke';

async function fetchJoke({ category = 'Any', contains = '' } = {}) {
  const params = new URLSearchParams();
  params.set('amount', '1');
  // Safe-mode: exclude highly offensive flags by default; keep it playful
  params.set('blacklistFlags', 'racist,sexist,explicit');

  if (contains) params.set('contains', contains);

  const url = `${API_BASE}/${encodeURIComponent(category)}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network error');
  const data = await res.json();

  if (data && (data.joke || (data.setup && data.delivery))) {
    return data.type === 'single' ? data.joke : `${data.setup} — ${data.delivery}`;
  }
  return 'No jokes found. Try a different category or search.';
}

// Favorites
const renderFavorites = () => {
  favList.innerHTML = '';
  if (!favorites.length) {
    const li = document.createElement('li');
    li.textContent = 'No favorites yet. Save something hilarious!';
    favList.appendChild(li);
    return;
  }
  favorites.forEach((j, idx) => {
    const li = document.createElement('li');

    const text = document.createElement('div');
    text.textContent = j;

    const actions = document.createElement('div');
    actions.className = 'fav-actions';

    const copy = document.createElement('button');
    copy.className = 'btn-outline-sm';
    copy.innerHTML = '<i class="fa-regular fa-copy"></i>';
    copy.title = 'Copy';
    copy.onclick = () => {
      navigator.clipboard.writeText(j);
    };

    const remove = document.createElement('button');
    remove.className = 'btn-outline-sm';
    remove.innerHTML = '<i class="fa-solid fa-trash"></i>';
    remove.title = 'Remove';
    remove.onclick = () => {
      favorites.splice(idx, 1);
      localStorage.setItem('wn_favorites', JSON.stringify(favorites));
      renderFavorites();
    };

    actions.append(copy, remove);
    li.append(text, actions);
    favList.appendChild(li);
  });
};

// Events
generateBtn.addEventListener('click', async () => {
  try {
    if (isTyping) return;
    const category = categoryEl.value || 'Any';
    const joke = await fetchJoke({ category });
    typeWriter(joke);
    setCountsForJoke(joke);
  } catch (e) {
    typeWriter("Oops! Couldn't fetch a joke. Try again.");
  }
});

searchBtn.addEventListener('click', async () => {
  try {
    if (isTyping) return;
    const category = categoryEl.value || 'Any';
    const q = searchEl.value.trim();
    if (!q) { searchEl.focus(); return; }
    const joke = await fetchJoke({ category, contains: q });
    typeWriter(joke);
    setCountsForJoke(joke);
  } catch (e) {
    typeWriter("No results. Try a different keyword.");
  }
});

saveBtn.addEventListener('click', () => {
  const text = jokeEl.textContent.trim();
  if (!text) return;
  if (!favorites.includes(text)) {
    favorites.unshift(text);
    favorites = favorites.slice(0, 100); // cap
    localStorage.setItem('wn_favorites', JSON.stringify(favorites));
    renderFavorites();
  }
});

copyBtn.addEventListener('click', () => {
  const text = jokeEl.textContent.trim();
  if (!text) return;
  navigator.clipboard.writeText(text);
});

shareBtn.addEventListener('click', async () => {
  const text = jokeEl.textContent.trim();
  if (!text) return;
  const shareData = { title: 'WitNest Joke', text, url: location.href };
  if (navigator.share) {
    try { await navigator.share(shareData); } catch (_) {}
  } else {
    navigator.clipboard.writeText(`${text} — via WitNest`);
    alert('Link copied for sharing!');
  }
});

$$('.react').forEach(btn => {
  btn.addEventListener('click', () => updateReaction(btn.dataset.reaction));
});

// Auto mode
autoBtn.addEventListener('click', () => {
  const pressed = autoBtn.getAttribute('aria-pressed') === 'true';
  if (!pressed) {
    const sec = Math.max(5, Math.min(120, Number(autoSecondsEl.value) || 15));
    autoBtn.setAttribute('aria-pressed', 'true');
    autoBtn.innerHTML = '<i class="fa-regular fa-circle-stop"></i> Stop';
    autoTimer = setInterval(() => generateBtn.click(), sec * 1000);
  } else {
    autoBtn.setAttribute('aria-pressed', 'false');
    autoBtn.innerHTML = '<i class="fa-regular fa-clock"></i> Start';
    clearInterval(autoTimer);
    autoTimer = null;
  }
});

// Panels
const togglePanel = (btn, panel) => {
  const hidden = panel.hasAttribute('hidden');
  if (hidden) {
    panel.removeAttribute('hidden');
    btn.setAttribute('aria-expanded', 'true');
  } else {
    panel.setAttribute('hidden', '');
    btn.setAttribute('aria-expanded', 'false');
  }
};

favOpen.addEventListener('click', () => {
  renderFavorites();
  togglePanel(favOpen, favSection);
});
aboutOpen.addEventListener('click', () => togglePanel(aboutOpen, aboutSection));
favClear.addEventListener('click', () => {
  if (!favorites.length) return;
  if (confirm('Clear all favorites?')) {
    favorites = [];
    localStorage.setItem('wn_favorites', JSON.stringify(favorites));
    renderFavorites();
  }
});

// Dark mode
const applyDark = (on) => {
  document.body.classList.toggle('dark', on);
  darkToggle.checked = on;
  localStorage.setItem('wn_dark', on ? '1' : '0');
};

darkToggle.addEventListener('change', () => applyDark(darkToggle.checked));

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'g' || e.key === 'G') generateBtn.click();
  if (e.key === '/' && document.activeElement !== searchEl) { e.preventDefault(); searchEl.focus(); }
});

// Init
(() => {
  // Footer year
  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  // Restore dark
  const darkSaved = localStorage.getItem('wn_dark') === '1';
  applyDark(darkSaved);

  // Render favorites on load
  renderFavorites();

  // First joke
  // generateBtn.click(); // uncomment if you want an immediate joke on load
})();
