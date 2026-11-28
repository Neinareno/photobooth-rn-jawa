/* Sisipan ornamen Jawa (wayang, gunungan, mega mendung) — palet tema. */
(function () {
  "use strict";
  function mount() {
    if (document.querySelector(".jw-ornaments, .jw-decor")) return;
    document.body.classList.add("jawa");
    const el = document.createElement("div");
    el.className = "jw-ornaments";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML =
      '<div class="jw-orn-paper"></div>' +
      '<img class="jw-orn-cloud c1" src="ornamen/mega-mendung.webp" alt="" />' +
      '<img class="jw-orn-cloud c2" src="ornamen/mega-mendung.webp" alt="" />' +
      '<img class="jw-orn-gunungan" src="assets/gunungan.webp" alt="" />' +
      '<img class="jw-orn-wayang left" src="assets/wayang-pria.webp" alt="" />' +
      '<img class="jw-orn-wayang right" src="assets/wayang-wanita.webp" alt="" />';
    document.body.insertBefore(el, document.body.firstChild);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
