// Runs before the page is drawn, so that it is in the right colours from the
// first frame instead of flashing the light theme while the application
// loads. It is a file of its own, loaded by a plain script tag, because the
// Content-Security-Policy does not allow inline script.
//
// The application stores the colours it last applied. On a first visit there
// is nothing stored, and the default look is dark.
(function () {
  var root = document.documentElement;
  var mode = 'dark';
  var colors = {};
  try {
    var stored = JSON.parse(localStorage.getItem('startpunkt.appearance') || 'null');
    if (stored && (stored.mode === 'light' || stored.mode === 'dark')) {
      mode = stored.mode;
      colors = stored.colors || {};
    }
  } catch (e) {
    // Storage is unavailable or unreadable. The defaults apply.
  }
  root.setAttribute('data-mode', mode);
  for (var name in colors) {
    // Only the custom properties the stylesheet knows, and only hex colours.
    if (/^--(bg|muted|text|primary|accent)$/.test(name) && /^#[0-9a-fA-F]{3,8}$/.test(colors[name])) {
      root.style.setProperty(name, colors[name]);
    }
  }
})();
