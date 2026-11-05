// One sound at a time on rmk.systems (see src/sound.ts). A demo with sound
// loads this before its own scripts and sets window.rmkSoundStop to its own
// pause. It tells the portfolio page when audible sound starts, and calls
// rmkSoundStop when the page says something else has started.
// Does nothing when the demo is opened on its own.
;(function () {
  if (window.parent === window) return
  function announce() {
    try {
      window.parent.postMessage({ type: 'rmk-sound-on' }, location.origin)
    } catch (e) {}
  }
  var proto = HTMLMediaElement.prototype
  var play = proto.play
  proto.play = function () {
    if (!this.muted && this.volume > 0) announce()
    return play.apply(this, arguments)
  }
  // Unmuting something that's already playing counts as starting sound
  var muted = Object.getOwnPropertyDescriptor(proto, 'muted')
  Object.defineProperty(proto, 'muted', {
    configurable: true,
    enumerable: muted.enumerable,
    get: muted.get,
    set: function (v) {
      if (this.muted && !v && !this.paused) announce()
      muted.set.call(this, v)
    },
  })
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data || e.data.type !== 'rmk-sound-stop') return
    if (window.rmkSoundStop) window.rmkSoundStop()
  })
})()
