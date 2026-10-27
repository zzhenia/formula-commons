/* Search for formulacommons.com, blog.formulacommons.com and zheniavasiliev.com.
   One Pagefind index per site (/pagefind/ on each domain, the blog lives in Formula's);
   this script loads one and merges the other, so every box searches everything.
   It fills [data-ps] (or replaces the old .fh-search link) in the header. */
(function () {
  var FORMULA = 'https://formulacommons.com/pagefind/';
  var ZHENIA = 'https://zheniavasiliev.com/pagefind/';
  var BASE = (document.currentScript && document.currentScript.src) || FORMULA + '../search.js';
  var MAX = 8;

  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = BASE.replace(/search\.js(\?.*)?$/, 'search.css$1');
  document.head.appendChild(css);

  var pf = null;
  function load() {
    if (!pf) {
      var own = location.hostname.replace(/^www\./, '') === 'zheniavasiliev.com';
      pf = import(own ? ZHENIA + 'pagefind.js' : FORMULA + 'pagefind.js').then(function (p) {
        return p.options({ excerptLength: 18 })
          .then(function () { return p.mergeIndex(own ? FORMULA : ZHENIA); })
          .then(function () { return p; });
      });
    }
    return pf;
  }

  function label(url) {
    if (url.indexOf('//blog.') > -1) return 'blog';
    if (url.indexOf('zheniavasiliev.com') > -1) return 'zhenia';
    return 'formula';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  var ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';

  function mount(slot) {
    var box = document.createElement('div');
    box.className = 'ps';
    box.innerHTML = '<label class="ps-field">' + ICON +
      '<input type="search" placeholder="search" aria-label="Search all sites" autocomplete="off" spellcheck="false">' +
      '<kbd>&#8984;K</kbd></label><div class="ps-results" role="listbox" hidden></div>';
    slot.replaceWith(box);

    var header = box.closest('header') || box.parentNode;
    var input = box.querySelector('input');
    var list = box.querySelector('.ps-results');
    var narrow = window.matchMedia('(max-width: 860px)');
    var seq = 0, active = -1;

    function expand(on) {
      header.classList.toggle('ps-active', on);
      box.classList.toggle('ps-open', on);
    }
    function close() {
      list.hidden = true;
      active = -1;
    }
    function links() { return list.querySelectorAll('a'); }
    function highlight(i) {
      var a = links();
      if (!a.length) return;
      active = (i + a.length) % a.length;
      a.forEach(function (el, n) { el.classList.toggle('ps-on', n === active); });
      a[active].scrollIntoView({ block: 'nearest' });
    }

    function run() {
      var q = input.value.trim(), mine = ++seq;
      expand(document.activeElement === input && (q !== '' || narrow.matches));
      if (!q) { close(); list.innerHTML = ''; return; }
      load().then(function (p) { return p.debouncedSearch(q, {}, 150); }).then(function (res) {
        if (mine !== seq || !res) return;
        return Promise.all(res.results.slice(0, MAX).map(function (r) { return r.data(); }));
      }).then(function (items) {
        if (mine !== seq || !items) return;
        list.innerHTML = items.length ? items.map(function (d) {
          return '<a role="option" href="' + esc(d.url) + '"><span class="ps-site">' + label(d.url) + '</span>' +
            '<span class="ps-title">' + esc(d.meta.title || d.url) + '</span>' +
            '<span class="ps-excerpt">' + d.excerpt + '</span></a>';
        }).join('') : '<p class="ps-empty">No results for “' + esc(q) + '”</p>';
        active = -1;
        list.hidden = false;
      }).catch(function () {
        if (mine !== seq) return;
        list.innerHTML = '<p class="ps-empty">Search is unavailable right now.</p>';
        list.hidden = false;
      });
    }

    input.addEventListener('input', run);
    input.addEventListener('focus', function () { load(); run(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); highlight(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
      else if (e.key === 'Enter') {
        var a = links()[active < 0 ? 0 : active];
        if (a) { e.preventDefault(); location.href = a.href; }
      } else if (e.key === 'Escape') { input.value = ''; run(); input.blur(); }
    });
    // Leaving the box (focus or click elsewhere) shrinks it back; the query stays for next time.
    box.addEventListener('focusout', function () {
      setTimeout(function () {
        if (!box.contains(document.activeElement)) { close(); expand(false); }
      }, 0);
    });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); input.select(); }
    });
  }

  function init() {
    var slot = document.querySelector('[data-ps]') || document.querySelector('.fh-search');
    if (slot) mount(slot);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
