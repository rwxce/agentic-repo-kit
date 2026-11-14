// Smooth scroll with Lenis defaults (a longer duration drags and overshoots).
// Off with prefers-reduced-motion; without JS the page scrolls natively.
(function () {
  if (!window.Lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  var lenis = new window.Lenis({ autoRaf: true })
  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    var anchor = event.target && event.target.closest && event.target.closest('a[href^="#"]')
    if (!anchor) return
    var href = anchor.getAttribute('href')
    var target = href.length > 1 ? document.getElementById(href.slice(1)) : document.body
    if (!target) return
    event.preventDefault()
    lenis.scrollTo(target)
    history.pushState(null, '', href)
  })
})()
