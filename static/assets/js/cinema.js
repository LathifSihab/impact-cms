/* Cinema reel — the participant clips as a scroll-driven stage.
 *
 * Two modes, and the plain one is the baseline rather than a fallback: a
 * full-bleed swipe rail, which is what a phone, a keyboard, reduced motion, a
 * blocked CDN and a JS-off visitor all get. On a wide viewport GSAP
 * ScrollTrigger pins the block and scroll position decides which clip is
 * centred, expanded and playing.
 *
 * Performance rules this file sticks to, because four videos in one viewport is
 * exactly where a stage like this normally falls over:
 *   - one clip plays at a time; the rest are paused on their poster
 *   - every state change is a transform or an opacity, never a layout property
 *   - the only per-frame work is writing one CSS custom property
 *   - nothing loads until it is near the viewport, and nothing autoplays on a
 *     metered connection or under prefers-reduced-motion
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-cinema]');
  if (!root) return;

  var viewport = root.querySelector('.cinema-viewport');
  var track = root.querySelector('[data-cinema-track]');
  var shots = Array.prototype.slice.call(root.querySelectorAll('[data-shot]'));
  var bar = root.querySelector('[data-cinema-bar]');
  var count = root.querySelector('[data-cinema-n]');
  var prev = root.querySelector('[data-cinema-prev]');
  var next = root.querySelector('[data-cinema-next]');
  if (shots.length < 2) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var mayPlay = !reduced && !saveData;
  var active = -1;
  var playing = null;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function videoOf(shot) { return shot.querySelector('video'); }

  function play(v) {
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* blocked: the poster stays */ });
  }

  /* ---- sound, and loading only what is nearly on screen ---- */
  shots.forEach(function (shot) {
    var v = videoOf(shot);
    v.muted = true;                       // muted is the condition for autoplay
    v.setAttribute('muted', '');
    v.loop = true;
    v.playsInline = true;

    var sound = shot.querySelector('[data-sound]');
    if (sound) {
      sound.addEventListener('click', function () {
        v.muted = !v.muted;
        shot.classList.toggle('is-loud', !v.muted);
        sound.setAttribute('aria-pressed', String(!v.muted));
        if (v.paused) play(v);
      });
    }

    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          v.preload = 'auto';
          obs.disconnect();
        });
      }, { rootMargin: '400px' });
      near.observe(shot);
    } else {
      v.preload = 'metadata';
    }
  });

  /* ---- which clip is live ---- */
  function setActive(i) {
    if (i === active || i < 0 || i >= shots.length) return;
    active = i;
    shots.forEach(function (shot, n) {
      var v = videoOf(shot);
      shot.classList.toggle('is-active', n === i);
      if (n === i) {
        playing = v;
        if (mayPlay) play(v);
      } else {
        v.pause();
        // leaving a clip also gives it its silence back
        if (!v.muted) {
          v.muted = true;
          shot.classList.remove('is-loud');
          var s = shot.querySelector('[data-sound]');
          if (s) s.setAttribute('aria-pressed', 'false');
        }
      }
    });
    if (count) count.textContent = pad(i + 1);
    if (bar) bar.style.transform = 'scaleX(' + ((i + 1) / shots.length) + ')';
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === shots.length - 1;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && playing) playing.pause();
  });

  /* ---- rail mode: the baseline ---- */
  function railMode() {
    var onNav = [];
    var io = null;

    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        var best = null;
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        });
        if (best && best.intersectionRatio > 0.55) setActive(shots.indexOf(best.target));
      }, { threshold: [0, 0.55, 0.9] });
      shots.forEach(function (s) { io.observe(s); });
    }

    function go(step) {
      var i = Math.max(0, Math.min(shots.length - 1, (active < 0 ? 0 : active) + step));
      shots[i].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth',
                                block: 'nearest', inline: 'center' });
      setActive(i);
    }
    [[prev, -1], [next, 1]].forEach(function (pair) {
      if (!pair[0]) return;
      var fn = function () { go(pair[1]); };
      pair[0].addEventListener('click', fn);
      onNav.push([pair[0], fn]);
    });

    setActive(0);
    return function () {
      if (io) io.disconnect();
      onNav.forEach(function (p) { p[0].removeEventListener('click', p[1]); });
    };
  }

  /* ---- cinema mode: pinned, scroll-driven ---- */
  function cinemaMode() {
    var gsap = window.gsap;
    var ST = window.ScrollTrigger;
    root.classList.add('is-cinema');
    document.documentElement.classList.add('has-cinema');

    var centre = gsap.quickTo(track, 'x', { duration: 0.75, ease: 'power3.out' });

    // offsetLeft is untouched by the scale transforms, so the maths stays stable
    // however far through a tween the track happens to be
    function xFor(i) {
      var shot = shots[i];
      return window.innerWidth / 2 - (shot.offsetLeft + shot.offsetWidth / 2);
    }

    function frame(i, animate) {
      setActive(i);
      if (animate === false) gsap.set(track, { x: xFor(i) });
      else centre(xFor(i));
      shots.forEach(function (shot, n) {
        var on = n === i;
        gsap.to(shot, { scale: on ? 1 : 0.78, duration: 0.75,
                        ease: 'power3.out', overwrite: 'auto' });
        gsap.to(shot.querySelector('.shot-dim'), { opacity: on ? 0 : 0.62,
                        duration: 0.6, overwrite: 'auto' });
        gsap.to(shot.querySelector('.glass'), { autoAlpha: on ? 1 : 0, y: on ? 0 : 16,
                        duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
      });
    }

    var steps = shots.length - 1;

    // the stage opens as the block arrives: one value per frame, read by CSS
    var opener = ST.create({
      trigger: root,
      start: 'top bottom',
      end: 'top top',
      scrub: true,
      onUpdate: function (self) {
        viewport.style.setProperty('--open', self.progress.toFixed(3));
      },
      onRefresh: function (self) {
        viewport.style.setProperty('--open', self.progress.toFixed(3));
      }
    });

    var pin = ST.create({
      trigger: root,
      start: 'top top',
      end: '+=' + steps * 85 + '%',
      pin: true,
      anticipatePin: 1,
      snap: {
        snapTo: 1 / steps,
        duration: { min: 0.15, max: 0.45 },
        delay: 0.04,
        ease: 'power1.inOut'
      },
      onUpdate: function (self) {
        // onUpdate fires every scroll frame, including all through a snap, so the
        // tweens are only touched when the centred clip actually changes
        var i = Math.round(self.progress * steps);
        if (i !== active) frame(i);
      },
      onRefresh: function () {
        frame(active < 0 ? 0 : active, false);
      }
    });

    function go(step) {
      var i = Math.max(0, Math.min(steps, (active < 0 ? 0 : active) + step));
      window.scrollTo(0, Math.round(pin.start + (pin.end - pin.start) * (i / steps)));
    }
    var handlers = [];
    [[prev, -1], [next, 1]].forEach(function (pair) {
      if (!pair[0]) return;
      var fn = function () { go(pair[1]); };
      pair[0].addEventListener('click', fn);
      handlers.push([pair[0], fn]);
    });

    frame(0, false);

    return function () {
      pin.kill(true);
      opener.kill();
      handlers.forEach(function (p) { p[0].removeEventListener('click', p[1]); });
      gsap.set(track, { clearProps: 'x' });
      shots.forEach(function (shot) {
        gsap.set([shot, shot.querySelector('.shot-dim'), shot.querySelector('.glass')],
                 { clearProps: 'all' });
      });
      viewport.style.removeProperty('--open');
      root.classList.remove('is-cinema');
      document.documentElement.classList.remove('has-cinema');
      active = -1;
    };
  }

  /* ---- pick a mode, and switch cleanly if the viewport changes ---- */
  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    var mm = window.gsap.matchMedia();
    mm.add('(min-width: 921px) and (prefers-reduced-motion: no-preference)', cinemaMode);
    mm.add('(max-width: 920px), (prefers-reduced-motion: reduce)', railMode);
  } else {
    // GSAP blocked or unreachable: the rail is already the CSS default
    railMode();
  }
})();

/* Scroll-to-expand stage — the media page.
 *
 * A frame that opens from a rounded card to full width as it is scrolled
 * through. The animation is one number: --expand, 0 to 1, written once per
 * frame and read by the clip-path in the stylesheet. Nothing is tweened, no
 * layout property is touched, and the CSS default is the finished state — so a
 * phone, reduced motion, or a blocked CDN all get a static full-width frame
 * rather than a card stuck half open.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-cine]');
  if (!root) return;

  var video = root.querySelector('.cine-video');
  var sound = root.querySelector('[data-cine-sound]');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);

  if (video) {
    video.muted = true;
    video.setAttribute('muted', '');
    if (sound) {
      sound.addEventListener('click', function () {
        video.muted = !video.muted;
        root.classList.toggle('is-loud', !video.muted);
        sound.setAttribute('aria-pressed', String(!video.muted));
        if (video.paused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
      });
    }

    // load and run it only while it is actually on screen
    if ('IntersectionObserver' in window) {
      var watch = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            video.preload = 'auto';
            if (!reduced && !saveData && video.paused) {
              var p = video.play();
              if (p && p.catch) p.catch(function () {});
            }
          } else if (!video.paused) {
            video.pause();
          }
        });
      }, { threshold: 0.25 });
      watch.observe(root);
    } else {
      video.preload = 'metadata';
    }
  }

  // the expansion itself is desktop-only; below that the CSS default stands
  if (!window.gsap || !window.ScrollTrigger || reduced) return;
  if (!window.matchMedia('(min-width: 821px)').matches) return;

  window.gsap.registerPlugin(window.ScrollTrigger);
  var mm = window.gsap.matchMedia();
  mm.add('(min-width: 821px) and (prefers-reduced-motion: no-preference)', function () {
    var st = window.ScrollTrigger.create({
      trigger: root,
      start: 'top bottom-=10%',
      end: 'center center',
      scrub: true,
      onUpdate: function (self) {
        root.style.setProperty('--expand', self.progress.toFixed(3));
      },
      onRefresh: function (self) {
        root.style.setProperty('--expand', self.progress.toFixed(3));
      }
    });
    return function () {
      st.kill();
      root.style.removeProperty('--expand');   // back to the CSS default: open
    };
  });
})();
