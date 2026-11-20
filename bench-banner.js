// Bench Pro banner on the resources page: types "The Bench", then "CLEAR THINKING",
// shows the PRO label, then the logo and the line; holds, blinks out, starts again.
// Same typing and blink-out as the zheniavasiliev.com home hero (src/typewriter.js there).
(function () {
  var banner = document.querySelector(".bp-banner");
  if (!banner || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var inner = banner.querySelector(".bp-in");
  var pro = banner.querySelector(".bp-pro");
  var late = [banner.querySelector(".bp-logo"), banner.querySelector(".bp-line")];
  var START_MS = 700, TITLE_MS = 70, SLOGAN_MS = 45, GAP_MS = 350, HOLD_MS = 6000,
      BLINKS = 3, BLINK_MS = 70, REST_MS = 500;

  // Each typed line keeps its untyped rest as an invisible ghost, so nothing reflows.
  function seg(el) {
    var text = el.textContent, t = document.createTextNode(""), g = document.createElement("span");
    g.className = "bp-ghost"; el.textContent = ""; el.appendChild(t); el.appendChild(g);
    return { el: el, text: text, t: t, g: g };
  }
  var name = seg(banner.querySelector(".bp-name")),
      clear = seg(banner.querySelector(".bp-clear")),
      thinking = seg(banner.querySelector(".bp-thinking")),
      segs = [name, clear, thinking];

  var caret = document.createElement("span");
  caret.className = "bp-caret";

  function show(el, on) { el.classList.toggle("bp-hide", !on); }

  function type(s, ms, done) {
    var n = 0;
    s.el.insertBefore(caret, s.g);
    (function step() {
      s.t.data = s.text.slice(0, ++n); s.g.textContent = s.text.slice(n);
      if (n < s.text.length) setTimeout(step, ms); else done();
    })();
  }

  // A few fast blinks, ending with everything off.
  function blinkOut(done) {
    var n = 0;
    (function step() {
      inner.style.visibility = n % 2 ? "" : "hidden";
      if (++n < BLINKS * 2 + 1) setTimeout(step, BLINK_MS);
      else setTimeout(function () { done(); inner.style.visibility = ""; }, BLINK_MS);
    })();
  }

  function reset() {
    segs.forEach(function (s) { s.t.data = ""; s.g.textContent = s.text; });
    name.el.insertBefore(caret, name.g);
    show(pro, false); late.forEach(function (el) { show(el, false); });
  }

  function run() {
    reset();
    setTimeout(function () {
      type(name, TITLE_MS, function () {
        setTimeout(function () {
          type(clear, SLOGAN_MS, function () {
            type(thinking, SLOGAN_MS, function () {
              setTimeout(function () {
                show(pro, true);
                setTimeout(function () {
                  late.forEach(function (el) { show(el, true); });
                  setTimeout(function () {
                    blinkOut(function () { reset(); setTimeout(run, REST_MS); });
                  }, HOLD_MS);
                }, GAP_MS);
              }, GAP_MS);
            });
          });
        }, GAP_MS);
      });
    }, START_MS);
  }

  run();
})();
