// Click or Enter to enlarge a loaded screenshot; Esc or the close button closes it and returns focus.
function initLightbox(root) {
  var dlg = root.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.innerHTML = '<button type="button" class="lb-close" aria-label="Close">Close ✕</button>';
  root.body.appendChild(dlg);
  var big = null;
  var last = null;
  dlg.querySelector('.lb-close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () { if (last) last.focus(); });

  function bind(fig) {
    var img = fig.querySelector('.frame img');
    if (!img || fig.querySelector('button.enlarge')) return;
    var btn = root.createElement('button');
    btn.type = 'button';
    btn.className = 'enlarge';
    btn.setAttribute('aria-label', 'Enlarge: ' + fig.querySelector('h3').textContent);
    img.parentNode.insertBefore(btn, img);
    btn.appendChild(img);
    btn.addEventListener('click', function () {
      last = btn;
      if (!big) { big = root.createElement('img'); dlg.appendChild(big); }
      big.src = img.getAttribute('src');
      big.alt = img.alt;
      dlg.showModal();
    });
  }
  root.querySelectorAll('.shot').forEach(function (fig) {
    if (fig.classList.contains('loaded')) bind(fig);
    fig.addEventListener('shot:loaded', function () { bind(fig); });
  });
}
document.addEventListener('DOMContentLoaded', function () { initLightbox(document); });
