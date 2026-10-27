/* Formula header: theme switch, mobile menu, and the search box (search.js, loaded below).
   Shared by formulacommons.com and blog.formulacommons.com. The theme is kept in a
   .formulacommons.com cookie so the choice carries across both sites. */
(function () {
  function saveTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('formula-theme', theme);
      localStorage.setItem('fc-theme', theme);
    } catch (e) {}
    document.cookie = 'fc-theme=' + theme + ';domain=.formulacommons.com;path=/;max-age=31536000;SameSite=Lax';
  }

  function init() {
    var toggle = document.getElementById('fh-theme');
    if (toggle) toggle.addEventListener('click', function () {
      saveTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });

    var btn = document.getElementById('fh-menu-btn');
    var menu = document.getElementById('fh-menu');
    var close = document.getElementById('fh-menu-close');
    if (btn && menu) {
      var setMenu = function (open) {
        menu.hidden = !open;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.style.overflow = open ? 'hidden' : '';
      };
      btn.addEventListener('click', function () { setMenu(menu.hidden); });
      if (close) close.addEventListener('click', function () { setMenu(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });
      window.addEventListener('resize', function () { if (window.innerWidth > 860) setMenu(false); });
    }
  }

  // search.js sits next to this file and carries the same ?v= stamp.
  var self = document.currentScript && document.currentScript.src;
  if (self) {
    var s = document.createElement('script');
    s.src = self.replace(/header\.js/, 'search.js');
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
