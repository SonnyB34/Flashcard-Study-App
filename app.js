(function () {
  const uid = () => Math.random().toString(36).slice(2, 9);
  const KEY = 'flashcards-v1';
  let state = { decks: [], activeId: null };
  let ui = { index: 0, flipped: false, query: '', editingId: null };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = JSON.parse(raw);
    } catch (e) {}
    if (!state.decks || !state.decks.length) {
      const id = uid();
      state = {
        activeId: id,
        decks: [
          {
            id,
            name: 'Sample deck',
            cards: [
              {
                id: uid(),
                front: 'What does CSS stand for?',
                back: 'Cascading Style Sheets',
              },
              {
                id: uid(),
                front: 'Which attribute links a label to an input?',
                back: "for (matching the input's id)",
              },
            ],
          },
        ],
      };
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  const $ = (s) => document.querySelector(s);
  const active = () =>
    state.decks.find((d) => d.id === state.activeId) || state.decks[0];
  const visibleCards = (deck) => {
    const q = ui.query.trim().toLowerCase();
    return q
      ? deck.cards.filter((c) =>
          (c.front + ' ' + c.back).toLowerCase().includes(q),
        )
      : deck.cards;
  };

  function renderSidebar() {
    const list = $('#deck-list');
    list.innerHTML = '';
    state.decks.forEach((d) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'deck-btn';
      b.setAttribute('aria-current', d.id === active().id ? 'true' : 'false');
      const name = document.createElement('span');
      name.textContent = d.name;
      const n = document.createElement('span');
      n.className = 'count';
      n.textContent = d.cards.length;
      b.append(name, n);
      b.onclick = () => {
        state.activeId = d.id;
        ui.index = 0;
        ui.flipped = false;
        ui.query = '';
        save();
        render();
      };
      li.append(b);
      list.append(li);
    });
  }

  function renderMain() {
    const deck = active();
    const main = $('#main');
    main.innerHTML = `
      <div class="deck-head">
        <h2></h2>
        <div class="toolbar">
          <button class="btn" id="rename-btn" type="button">Rename</button>
          <button class="btn btn-danger" id="delete-btn" type="button">Delete</button>
        </div>
      </div>
      <div class="toolbar" role="toolbar" aria-label="Deck tools">
        <label for="search" class="visually-hidden">Search cards</label>
        <input type="search" id="search" placeholder="Search cards">
        <button class="btn" id="shuffle-btn" type="button">Shuffle</button>
        <button class="btn btn-primary" id="new-card-btn" type="button">New card</button>
      </div>
      <div class="stage" id="stage"></div>`;
    main.querySelector('h2').textContent = deck.name;
    const search = $('#search');
    search.value = ui.query;
    search.oninput = (e) => {
      ui.query = e.target.value;
      ui.index = 0;
      ui.flipped = false;
      renderStage();
    };
    $('#rename-btn').onclick = () => openDeckDialog(deck);
    $('#delete-btn').onclick = () => confirmDelete(deck);
    $('#shuffle-btn').onclick = () => {
      for (let i = deck.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck.cards[i], deck.cards[j]] = [deck.cards[j], deck.cards[i]];
      }
      ui.index = 0;
      ui.flipped = false;
      save();
      renderStage();
    };
    $('#new-card-btn').onclick = () => $('#card-dialog').showModal();
    renderStage();
  }

  function renderStage() {
    const deck = active(),
      cards = visibleCards(deck),
      stage = $('#stage');
    if (ui.index >= cards.length) ui.index = Math.max(0, cards.length - 1);
    if (!cards.length) {
      stage._go = null;
      stage.innerHTML = `<p class="empty">${deck.cards.length ? 'No cards match your search.' : 'This deck is empty. Add your first card with New card.'}</p>`;
      return;
    }
    const c = cards[ui.index];
    stage.innerHTML = `
      <button class="card ${ui.flipped ? 'flipped' : ''}" id="card" type="button" aria-label="Flashcard. Press to flip.">
        <div class="card-inner"><div class="face front"></div><div class="face back"></div></div>
      </button>
      <div class="nav">
        <button class="btn" id="prev" type="button" aria-label="Previous card">Prev</button>
        <span aria-live="polite">${ui.index + 1} of ${cards.length}</span>
        <button class="btn" id="next" type="button" aria-label="Next card">Next</button>
        <button class="btn" id="flip" type="button">Flip</button>
      </div>`;
    stage.querySelector('.front').textContent = c.front;
    stage.querySelector('.back').textContent = c.back;
    const go = (step) => {
      ui.index = (ui.index + step + cards.length) % cards.length;
      ui.flipped = false;
      renderStage();
    };
    const flip = () => {
      ui.flipped = !ui.flipped;
      $('#card').classList.toggle('flipped', ui.flipped);
    };
    $('#card').onclick = flip;
    $('#flip').onclick = flip;
    $('#prev').onclick = () => go(-1);
    $('#next').onclick = () => go(1);
    stage._go = go;
  }

  // Create / rename deck
  function openDeckDialog(deck) {
    ui.editingId = deck ? deck.id : null;
    $('#deck-dialog-title').textContent = deck ? 'Rename deck' : 'New deck';
    $('#deck-name').value = deck ? deck.name : '';
    $('#deck-dialog').showModal();
  }
  $('#new-deck-btn').onclick = () => openDeckDialog(null);
  $('#deck-form').addEventListener('submit', () => {
    const name = $('#deck-name').value.trim();
    if (!name) return;
    if (ui.editingId)
      state.decks.find((d) => d.id === ui.editingId).name = name;
    else {
      const d = { id: uid(), name, cards: [] };
      state.decks.push(d);
      state.activeId = d.id;
      ui.index = 0;
      ui.flipped = false;
    }
    save();
    render();
  });

  $('#card-form').addEventListener('submit', () => {
    const f = $('#card-front').value.trim(),
      b = $('#card-back').value.trim();
    if (!f || !b) return;
    active().cards.push({ id: uid(), front: f, back: b });
    $('#card-front').value = '';
    $('#card-back').value = '';
    ui.query = '';
    save();
    render();
  });

  // Delete deck with confirm dialog
  function confirmDelete(deck) {
    $('#confirm-text').textContent =
      `"${deck.name}" and its ${deck.cards.length} card(s) will be removed.`;
    const dlg = $('#confirm-dialog');
    dlg.returnValue = '';
    dlg.onclose = () => {
      if (dlg.returnValue !== 'delete') return;
      state.decks = state.decks.filter((d) => d.id !== deck.id);
      if (!state.decks.length)
        state.decks.push({ id: uid(), name: 'New deck', cards: [] });
      state.activeId = state.decks[0].id;
      ui.index = 0;
      ui.flipped = false;
      save();
      render();
    };
    dlg.showModal();
  }

  document
    .querySelectorAll('[data-close]')
    .forEach((b) => (b.onclick = () => b.closest('dialog').close()));

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return;
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const stage = $('#stage');
    if (!stage || !stage._go) return;
    if (e.key === 'ArrowRight') stage._go(1);
    else if (e.key === 'ArrowLeft') stage._go(-1);
    else if (e.key === ' ' && tag !== 'BUTTON') {
      e.preventDefault();
      $('#flip').click();
    }
  });

  function render() {
    renderSidebar();
    renderMain();
  }
  load();
  render();
})();
