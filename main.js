/* ================================================================
   Formula — Main JavaScript
   Theme toggle, email gate, copy-to-clipboard, mobile nav
   ================================================================ */

(function () {
  'use strict';

  // --- Theme Toggle ---
  // Shared with blog.formulacommons.com via a parent-domain cookie, so the
  // choice carries across both sites (localStorage is per-origin).
  const THEME_KEY = 'formula-theme';
  const THEME_COOKIE = 'fc-theme';

  function getCookieTheme() {
    var m = document.cookie.match(/(?:^|;\s*)fc-theme=(dark|light)/);
    return m ? m[1] : null;
  }

  function getPreferredTheme() {
    const cookie = getCookieTheme();
    if (cookie) return cookie;
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    document.cookie = THEME_COOKIE + '=' + theme +
      ';domain=.formulacommons.com;path=/;max-age=31536000;SameSite=Lax';
  }

  applyTheme(getPreferredTheme());

  document.addEventListener('DOMContentLoaded', function () {
    var toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme') || 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    }

    // --- Mobile Nav ---
    var hamburger = document.getElementById('hamburger');
    var mobileMenu = document.getElementById('mobile-menu');
    var mobileClose = document.getElementById('mobile-close');

    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', function () {
        mobileMenu.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    }
    if (mobileClose && mobileMenu) {
      mobileClose.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    }

    // --- Email Gate Modal ---
    var modal = document.getElementById('email-gate');
    var modalName = document.getElementById('modal-resource-name');
    var modalBtn = document.getElementById('modal-submit');
    var modalForm = document.getElementById('modal-form');
    var modalFormEl = document.getElementById('gate-form');
    var modalSuccess = document.getElementById('modal-success');
    var modalSuccessLink = document.getElementById('success-link');
    var closeModal = document.getElementById('modal-close');
    var currentResourceUrl = '';

    // Cookie helpers — store list of unlocked resource slugs
    var GATE_KEY = 'formula-unlocked';

    function getUnlocked() {
      try {
        return JSON.parse(localStorage.getItem(GATE_KEY) || '[]');
      } catch (e) { return []; }
    }

    function markUnlocked(slug) {
      var list = getUnlocked();
      if (list.indexOf(slug) === -1) list.push(slug);
      localStorage.setItem(GATE_KEY, JSON.stringify(list));
    }

    function isUnlocked(slug) {
      return getUnlocked().indexOf(slug) !== -1;
    }

    // Resource category map — used to tag Mailchimp contacts
    var RESOURCE_CATEGORIES = {
      'vibe-coding-starter-pack': 'vibe-coding',
      'finance-calendar': 'sheets-template',
      'slipbox-idea-capture': 'sheets-template',
      'vendor-matrix': 'sheets-template',
      'everyday-use-cases': 'sheets-template',
      'shopping': 'sheets-template',
      'spanish-vocab': 'sheets-template',
      'currency-converter': 'sheets-template',
      'simple-dropdown': 'sheets-template',
      'monthly-financial-tasks': 'sheets-template',
      'project-plan': 'sheets-template',
      'wish-replenish': 'sheets-template'
    };

    // Open email gate or go directly if already subscribed.
    // opts.fromLink — arriving via a deep link, so there is no user gesture to
    // spend on window.open (popup blockers eat it). Show the success card with
    // the link instead and let the visitor click it.
    window.openGate = function (slug, name, url, opts) {
      opts = opts || {};
      currentResourceUrl = url;

      if (isUnlocked(slug)) {
        if (!opts.fromLink) {
          window.open(url, '_blank');
          return;
        }
        if (modalName) modalName.textContent = name;
        if (modalForm) modalForm.style.display = 'none';
        if (modalSuccess) modalSuccess.style.display = 'block';
        if (modalSuccessLink) {
          modalSuccessLink.href = url;
          modalSuccessLink.textContent = 'Open template →';
        }
        if (modal) modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        return;
      }
      if (modalName) modalName.textContent = name;
      if (modalBtn) modalBtn.textContent = 'download ' + name.toLowerCase() + ' \u2192';
      if (modalForm) modalForm.style.display = 'block';
      if (modalSuccess) modalSuccess.style.display = 'none';
      if (modal) modal.classList.add('open');
      document.body.style.overflow = 'hidden';

      // Store slug + category for after submission
      if (modal) {
        modal.setAttribute('data-slug', slug);
        modal.setAttribute('data-category', RESOURCE_CATEGORIES[slug] || 'sheets-template');
      }
    };

    // Every gated resource carries data-gate / -slug / -name / -url.
    // One delegated handler covers them all; the "watch" links inside a row
    // stop propagation so they still open YouTube instead of the gate.
    document.addEventListener('click', function (e) {
      var item = e.target.closest && e.target.closest('[data-gate]');
      if (!item) return;
      window.openGate(
        item.getAttribute('data-slug'),
        item.getAttribute('data-name'),
        item.getAttribute('data-url')
      );
    });

    if (closeModal) {
      closeModal.addEventListener('click', function () {
        modal.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) {
          modal.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    }

    // Form submission
    if (modalFormEl) {
      modalFormEl.addEventListener('submit', function (e) {
        e.preventDefault();

        var email = document.getElementById('gate-email').value.trim();
        if (!email) return;

        var gateName = document.getElementById('gate-name').value.trim();

        // Submit to the signup relay (Cloudflare Worker -> Ghost members).
        // Replaced the Mailchimp JSONP call 260822 — Ghost is the single
        // subscriber database now; labels carry the old tag semantics.
        var gateSlug = modal.getAttribute('data-slug') || 'unknown';
        subscribeViaRelay({
          email: email,
          name: gateName,
          resource: gateSlug,
          source: 'formula-website'
        });

        // Mark as unlocked
        var slug = modal.getAttribute('data-slug');
        if (slug) markUnlocked(slug);

        // Show success state
        if (modalForm) modalForm.style.display = 'none';
        if (modalSuccess) modalSuccess.style.display = 'block';
        if (modalSuccessLink) {
          modalSuccessLink.href = currentResourceUrl;
          modalSuccessLink.textContent = 'Open template \u2192';
        }
      });
    }

    // Signup relay — fire-and-forget; the unlock UX never blocks on it
    var RELAY_URL = 'https://formula-signup-relay.zzhenia.workers.dev';
    function subscribeViaRelay(payload) {
      try {
        fetch(RELAY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(function () { /* silently succeed, like the old JSONP */ });
      } catch (err) { /* ignore */ }
    }

    // --- Newsletter Form ---
    var nlForm = document.getElementById('newsletter-form');
    if (nlForm) {
      nlForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var email = document.getElementById('nl-email').value.trim();
        if (!email) return;

        var firstName = document.getElementById('nl-fname').value.trim();

        subscribeViaRelay({
          email: email,
          name: firstName,
          resource: 'newsletter',
          source: 'formula-website'
        });

        // Show confirmation
        nlForm.innerHTML = '<p style="color:var(--accent);font-weight:600;">You\'re subscribed!</p>';
      });
    }

    // --- Accordion Toggle ---
    window.toggleAccordion = function (header) {
      var item = header.closest('.accordion-item');
      if (item) item.classList.toggle('open');
    };

    // --- Copy to Clipboard ---
    window.copyText = function (text, label) {
      navigator.clipboard.writeText(text).then(function () {
        showToast(label ? 'Copied: ' + label : 'Copied');
      }).catch(function () {
        // Fallback
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast(label ? 'Copied: ' + label : 'Copied');
      });
    };

    // --- Toast ---
    var toast = document.getElementById('toast');
    var toastTimer = null;

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toast.classList.remove('show');
      }, 1800);
    }

    // --- Category Filter ---
    var catPills = document.querySelectorAll('.cat-pill[data-cat]');
    catPills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        var cat = pill.getAttribute('data-cat');
        var isActive = pill.classList.contains('active');

        // Toggle: if already active, show all
        catPills.forEach(function (p) { p.classList.remove('active'); });
        if (!isActive) pill.classList.add('active');

        var filterCat = isActive ? null : cat;
        var sections = document.querySelectorAll('[data-section-cat]');
        sections.forEach(function (sec) {
          if (!filterCat || sec.getAttribute('data-section-cat') === filterCat) {
            sec.style.display = '';
          } else {
            sec.style.display = 'none';
          }
        });
      });
    });

    // --- Deep links ---
    // formulacommons.com/#slug scrolls to that resource, highlights the row,
    // and opens its gate — so a YouTube description can point straight at one
    // download instead of at the top of a long page.
    var HIGHLIGHT_MS = 3000;
    var highlightTimer = null;

    function openFromHash(hash) {
      var slug = (hash || '').replace(/^#/, '').trim();
      if (!slug) return;

      var target = document.getElementById(slug);
      if (!target || !target.hasAttribute('data-gate')) return;

      // A category filter may have hidden the section the target sits in
      var section = target.closest('[data-section-cat]');
      if (section && section.style.display === 'none') section.style.display = '';

      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('deep-link-target');
      if (highlightTimer) clearTimeout(highlightTimer);
      highlightTimer = setTimeout(function () {
        target.classList.remove('deep-link-target');
      }, HIGHLIGHT_MS);

      // Let the scroll finish before the modal locks body overflow
      setTimeout(function () {
        window.openGate(
          target.getAttribute('data-slug'),
          target.getAttribute('data-name'),
          target.getAttribute('data-url'),
          { fromLink: true }
        );
      }, 550);
    }

    // ?e=1 marks a click from a nurture email — that reader already gave
    // their email at download time, so unlock their resource up front and
    // the gate shows "Open template →" instead of asking again.
    if (new URLSearchParams(window.location.search).get('e') === '1') {
      var emailSlug = (window.location.hash || '').replace(/^#/, '').trim();
      if (emailSlug) markUnlocked(emailSlug);
    }

    openFromHash(window.location.hash);
    window.addEventListener('hashchange', function () {
      openFromHash(window.location.hash);
    });
  });
})();
