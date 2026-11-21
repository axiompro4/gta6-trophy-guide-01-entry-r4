/* Leonida Trophy Atlas — vanilla JS tracker. Loads only ./data/trophies.json; no network requests. */
(function () {
  'use strict';

  var STORAGE_KEY = 'leonida-trophy-atlas-v1';
  var state = { earned: {}, spoiler: false };
  var trophies = [];
  var meta = {};
  var filters = { grade: 'all', kind: 'all', earned: 'all', q: '' };

  var listEl = document.getElementById('trophy-list');
  var countEl = document.getElementById('count');
  var emptyEl = document.getElementById('empty');
  var breakdownEl = document.getElementById('kind-breakdown');

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.earned && typeof parsed.earned === 'object') state.earned = parsed.earned;
          if (typeof parsed.spoiler === 'boolean') state.spoiler = parsed.spoiler;
        }
      }
    } catch (e) { /* corrupted storage: start clean */ }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function applyParams() {
    var params = new URLSearchParams(location.search);
    var view = params.get('view');
    if (view === 'roadmap') showView('roadmap');
    var spoiler = params.get('spoiler');
    if (spoiler === 'on') state.spoiler = true;
    var kind = params.get('kind');
    if (kind && ['story', 'missable', 'collectibles', 'activities', 'online'].indexOf(kind) !== -1) {
      filters.kind = kind;
    }
    var hash = location.hash.replace('#', '');
    if (hash === 'roadmap') showView('roadmap');
  }

  function showView(name) {
    document.querySelectorAll('.view-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === name);
    });
    document.getElementById('view-checklist').hidden = name !== 'checklist';
    document.getElementById('view-roadmap').hidden = name !== 'roadmap';
  }

  function isEarned(t) { return !!state.earned[t.id]; }

  function matches(t) {
    if (filters.grade !== 'all' && t.grade !== filters.grade) return false;
    if (filters.kind !== 'all' && t.kind !== filters.kind) return false;
    if (filters.earned === 'done' && !isEarned(t)) return false;
    if (filters.earned === 'todo' && isEarned(t)) return false;
    if (filters.q) {
      var hay = (t.name + ' ' + t.description + ' ' + t.guide + ' ' + (t.sources || []).join(' ')).toLowerCase();
      if (hay.indexOf(filters.q) === -1) return false;
    }
    return true;
  }

  function render() {
    var shown = trophies.filter(matches);
    var earnedCount = trophies.filter(isEarned).length;
    var total = trophies.length || 55;
    var pct = total ? Math.round((earnedCount / total) * 100) : 0;

    document.getElementById('stat-earned').textContent = earnedCount;
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-pct').textContent = pct + '%';
    document.getElementById('progress-fill').style.width = pct + '%';
    countEl.textContent = 'Showing ' + shown.length + ' of ' + total + ' trophies — ' + earnedCount + ' earned.';
    emptyEl.hidden = shown.length !== 0;

    var kinds = ['story', 'missable', 'collectibles', 'activities', 'online'];
    breakdownEl.innerHTML = kinds.map(function (k) {
      var inKind = trophies.filter(function (t) { return t.kind === k; });
      var done = inKind.filter(isEarned).length;
      return '<span class="kind-chip"><b>' + esc(k) + '</b> ' + done + '/' + inKind.length + '</span>';
    }).join('');

    listEl.innerHTML = shown.map(function (t) {
      var hiddenSpoiler = state.spoiler && t.hidden;
      var name = hiddenSpoiler ? 'Hidden trophy — story spoiler' : esc(t.name);
      var desc = hiddenSpoiler
        ? '<p class="desc spoiler-hidden">Hidden until earned, or turn off “Hide story spoilers”.</p>'
        : '<p class="desc">' + esc(t.description) + '</p>';
      var guide = hiddenSpoiler
        ? '<p class="guide spoiler-hidden">Guide hidden with the spoiler.</p>'
        : '<p class="guide"><strong>Guide:</strong> ' + esc(t.guide) + '</p>';
      var badges = '<span class="badge ' + esc(t.grade) + '">' + esc(t.grade) + '</span>' +
        (t.kind === 'missable' ? '' : '<span class="badge kind">' + esc(t.kind) + '</span>') +
        (t.missable ? '<span class="badge missable">Missable</span>' : '') +
        (t.hidden ? '<span class="badge hidden-badge">Hidden</span>' : '');
      var ariaName = hiddenSpoiler ? 'Hidden trophy' : t.name;
      return '<li class="trophy' + (isEarned(t) ? ' earned' : '') + '">' +
        '<label class="check"><input type="checkbox" data-id="' + t.id + '"' +
        (isEarned(t) ? ' checked' : '') + ' aria-label="Mark ' + esc(ariaName) + ' as earned"></label>' +
        '<div class="trophy-body"><div class="trophy-head"><h3>' + name + '</h3>' + badges + '</div>' +
        desc + guide +
        '<p class="sources">Sources: ' + (t.sources || []).map(esc).join(', ') + '</p></div></li>';
    }).join('');

    document.getElementById('spoiler-toggle').checked = state.spoiler;
  }

  function bind() {
    listEl.addEventListener('change', function (ev) {
      var id = ev.target && ev.target.dataset && ev.target.dataset.id;
      if (!id) return;
      if (ev.target.checked) state.earned[id] = true; else delete state.earned[id];
      saveState();
      render();
    });

    document.getElementById('search').addEventListener('input', function (ev) {
      filters.q = ev.target.value.trim().toLowerCase();
      render();
    });

    document.getElementById('spoiler-toggle').addEventListener('change', function (ev) {
      state.spoiler = ev.target.checked;
      saveState();
      render();
    });

    document.getElementById('filters').addEventListener('click', function (ev) {
      var btn = ev.target.closest('button');
      if (!btn) return;
      var group = btn.parentElement.dataset.group;
      if (!group) return;
      btn.parentElement.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      if (group === 'grade') filters.grade = btn.dataset.grade;
      if (group === 'kind') filters.kind = btn.dataset.kind;
      if (group === 'earned') filters.earned = btn.dataset.earned;
      render();
    });

    document.querySelectorAll('.view-btn').forEach(function (b) {
      b.addEventListener('click', function () { showView(b.dataset.view); });
    });

    document.getElementById('export-btn').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify({ app: 'leonida-trophy-atlas', exported: new Date().toISOString(), state: state }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'leonida-trophy-atlas-progress.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatus('Progress exported.');
    });

    document.getElementById('import-file').addEventListener('change', function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var parsed = JSON.parse(reader.result);
          var incoming = parsed.state || parsed;
          if (!incoming || typeof incoming.earned !== 'object') throw new Error('bad file');
          state.earned = incoming.earned;
          if (typeof incoming.spoiler === 'boolean') state.spoiler = incoming.spoiler;
          saveState();
          render();
          setStatus('Progress imported — ' + Object.keys(state.earned).length + ' trophies earned.');
        } catch (e) {
          setStatus('Import failed: that file is not a Leonida Trophy Atlas export.');
        }
      };
      reader.readAsText(file);
      ev.target.value = '';
    });

    document.getElementById('reset-btn').addEventListener('click', function () {
      if (!window.confirm('Reset all earned trophies?')) return;
      state.earned = {};
      saveState();
      render();
      setStatus('Progress reset.');
    });
  }

  function setStatus(msg) {
    document.getElementById('io-status').textContent = msg;
  }

  function init() {
    loadState();
    applyParams();
    bind();
    fetch('./data/trophies.json')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        trophies = data.trophies || [];
        meta = data;
        render();
      })
      .catch(function () {
        listEl.innerHTML = '<li class="trophy"><div class="trophy-body"><p>Could not load ./data/trophies.json — the trophy list is missing.</p></div></li>';
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
