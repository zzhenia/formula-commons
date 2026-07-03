/* ================================================================
   Formula — Main JavaScript
   Theme toggle, email gate, copy-to-clipboard, mobile nav
   ================================================================ */

(function () {
  'use strict';

  // --- Theme Toggle ---
  const THEME_KEY = 'formula-theme';

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
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

    // Open email gate or go directly if already subscribed
    window.openGate = function (slug, name, url) {
      if (isUnlocked(slug)) {
        window.open(url, '_blank');
        return;
      }
      currentResourceUrl = url;
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

        var firstName = document.getElementById('gate-fname').value.trim();
        var lastName = document.getElementById('gate-lname').value.trim();

        // Submit to Mailchimp via JSONP
        var mcUrl = modalFormEl.getAttribute('data-mc-url');
        var category = modal.getAttribute('data-category') || 'sheets-template';
        var resourceName = modalName ? modalName.textContent : '';

        if (mcUrl) {
          var params = new URLSearchParams();
          params.set('EMAIL', email);
          if (firstName) params.set('FNAME', firstName);
          if (lastName) params.set('LNAME', lastName);
          // Merge fields — these must be created in Mailchimp first
          // (Audience > Settings > Audience fields and *|MERGE|* tags)
          params.set('MMERGE6', resourceName);   // RESOURCE merge field
          params.set('MMERGE7', 'formula-website'); // SOURCE merge field
          // Tags — Mailchimp embedded forms accept tags via hidden fields
          // Format: tags=TAG_ID or multiple tags params
          // We pass the category + 'formula-website' as tag names
          params.set('tags', category + ',formula-website');

          // JSONP request to Mailchimp
          var fullUrl = mcUrl + '&' + params.toString();
          var script = document.createElement('script');
          script.src = fullUrl + '&c=mcCallback';
          document.body.appendChild(script);
          // Remove script tag after load
          script.onload = function () { script.remove(); };
          script.onerror = function () { script.remove(); };
        }

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

    // Mailchimp JSONP callback
    window.mcCallback = function () {
      // Silently succeed
    };

    // --- Newsletter Form ---
    var nlForm = document.getElementById('newsletter-form');
    if (nlForm) {
      nlForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var email = document.getElementById('nl-email').value.trim();
        if (!email) return;

        var firstName = document.getElementById('nl-fname').value.trim();
        var mcUrl = nlForm.getAttribute('data-mc-url');

        if (mcUrl) {
          var params = new URLSearchParams();
          params.set('EMAIL', email);
          if (firstName) params.set('FNAME', firstName);
          params.set('MMERGE7', 'formula-website');
          params.set('tags', 'newsletter,formula-website');

          var script = document.createElement('script');
          script.src = mcUrl + '&' + params.toString() + '&c=mcCallback';
          document.body.appendChild(script);
          script.onload = function () { script.remove(); };
          script.onerror = function () { script.remove(); };
        }

        // Show confirmation
        nlForm.innerHTML = '<p style="color:var(--accent);font-weight:600;">You\'re subscribed!</p>';
      });
    }

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
  });
})();
