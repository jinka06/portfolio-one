(function () {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (reducedMotion) {
        root.dataset.motion = 'off';
    }

    function motionOff() {
        return root.dataset.motion === 'off';
    }

    

    const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789#%&*+-=<>/';
    const SCRAMBLE_MS = 650;

    function setupScramble(el) {
        const text = el.textContent.trim();
        el.textContent = '';

        
        const visible = document.createElement('span');
        visible.setAttribute('aria-hidden', 'true');
        visible.textContent = text;
        const real = document.createElement('span');
        real.className = 'sr-only';
        real.textContent = text;
        el.append(visible, real);

        el._scramble = { text: text, visible: visible, raf: 0 };
    }

    function runScramble(el) {
        const state = el._scramble;
        if (!state || motionOff()) {
            return;
        }

        cancelAnimationFrame(state.raf);
        const start = performance.now();

        function tick(now) {
            const t = Math.min((now - start) / SCRAMBLE_MS, 1);
            let out = '';

            for (let i = 0; i < state.text.length; i++) {
                const letter = state.text[i];
                
                const settleAt = 0.3 + (i / state.text.length) * 0.7;
                if (letter === ' ' || t >= settleAt) {
                    out += letter;
                } else {
                    out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                }
            }

            state.visible.textContent = out;

            if (t < 1) {
                state.raf = requestAnimationFrame(tick);
            } else {
                state.visible.textContent = state.text;
            }
        }

        state.raf = requestAnimationFrame(tick);
    }

    const scrambleItems = document.querySelectorAll('[data-scramble]');
    scrambleItems.forEach(function (el, index) {
        setupScramble(el);
        el.addEventListener('mouseenter', function () { runScramble(el); });
        el.addEventListener('focus', function () { runScramble(el); });
        setTimeout(function () { runScramble(el); }, 400 + index * 90); 
    });

    

    const sequence = document.querySelector('.sequence');
    if (sequence) {
        const frames = sequence.querySelectorAll('.sequence__frames img');
        const counter = sequence.querySelector('.sequence__count');
        const STEP = 90; 
        let current = 0;
        let z = 1;
        let travelled = 0;
        let lastX = null;
        let lastY = null;

        function pad(n) {
            return String(n).padStart(2, '0');
        }

        function next() {
            current = (current + 1) % frames.length;
            const frame = frames[current];
            z += 1;
            frame.style.zIndex = z;
            frame.style.opacity = 1;

            
            frame.animate(
                [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
                { duration: motionOff() ? 0 : 550, easing: 'cubic-bezier(0.7, 0, 0.2, 1)' }
            );

            if (counter) {
                counter.textContent = pad(current + 1) + ' / ' + pad(frames.length);
            }
        }

        sequence.addEventListener('pointermove', function (event) {
            if (event.pointerType === 'touch') {
                return;
            }
            if (lastX !== null) {
                travelled += Math.hypot(event.clientX - lastX, event.clientY - lastY);
            }
            lastX = event.clientX;
            lastY = event.clientY;

            if (travelled > STEP) {
                travelled = 0;
                next();
            }
        });

        sequence.addEventListener('pointerleave', function () {
            lastX = null;
            lastY = null;
        });

        
        sequence.addEventListener('click', function () {
            if (!finePointer) {
                next();
            }
        });
    }

    

    if (finePointer) {
        const cursor = document.querySelector('.cursor');
        const label = document.querySelector('.cursor__label');
        const preview = document.querySelector('.preview');
        const previewImg = preview.querySelector('img');

        
        document.querySelectorAll('[data-img]').forEach(function (row) {
            const image = new Image();
            image.src = row.dataset.img;
        });

        let mx = -100;
        let my = -100;
        let cx = -100;
        let cy = -100;
        let px = -100;
        let py = -100;
        let running = false;

        function loop() {
            cx += (mx - cx) * 0.22;
            cy += (my - cy) * 0.22;
            px += (mx - px) * 0.12; 
            py += (my - py) * 0.12;

            cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
            preview.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0)';

            const moving = Math.abs(mx - cx) + Math.abs(my - cy) + Math.abs(mx - px) + Math.abs(my - py);
            if (moving < 0.5) {
                running = false; 
                return;
            }
            requestAnimationFrame(loop);
        }

        document.addEventListener('pointermove', function (event) {
            mx = event.clientX;
            my = event.clientY;
            cursor.classList.add('is-on');

            const target = event.target.closest('[data-cursor]');
            if (target) {
                label.textContent = target.dataset.cursor;
                cursor.classList.add('is-big');
                cursor.classList.toggle('is-deep', target.dataset.cursorTheme === 'deep');
            } else {
                cursor.classList.remove('is-big', 'is-deep');
            }

            const row = event.target.closest('[data-img]');
            if (row) {
                if (previewImg.getAttribute('src') !== row.dataset.img) {
                    previewImg.src = row.dataset.img;
                }
                preview.classList.add('is-on');
            } else {
                preview.classList.remove('is-on');
            }

            if (!running) {
                running = true;
                requestAnimationFrame(loop);
            }
        }, { passive: true });

        document.addEventListener('pointerleave', function () {
            cursor.classList.remove('is-on');
            preview.classList.remove('is-on');
        });
    }

    

    const revealItems = document.querySelectorAll('.reveal-up');

    if ('IntersectionObserver' in window && !motionOff()) {
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });

        revealItems.forEach(function (el) { observer.observe(el); });
    } else {
        revealItems.forEach(function (el) { el.classList.add('is-in'); });
    }

    

    const pause = document.querySelector('.pause');
    if (pause) {
        if (motionOff()) {
            pause.setAttribute('aria-pressed', 'true');
            pause.textContent = 'Reduce motion: on';
        }

        pause.addEventListener('click', function () {
            const off = !motionOff();
            root.dataset.motion = off ? 'off' : 'on';
            pause.setAttribute('aria-pressed', String(off));
            pause.textContent = off ? 'Reduce motion: on' : 'Reduce motion: off';

            if (off) {
                revealItems.forEach(function (el) { el.classList.add('is-in'); });
            }
        });
    }
})();







(function () {
    const root = document.documentElement;

    const THEMES = {
        ember: { prefix: 'photo', color: '#180000' },
        paper: { prefix: 'paper', color: '#F3ECDD' },
        signal: { prefix: 'signal', color: '#0A0F1E' },
    };

    const buttons = document.querySelectorAll('[data-theme-set]');
    const frames = document.querySelectorAll('.sequence__frames img');
    const rows = document.querySelectorAll('[data-img]');
    const metaColor = document.querySelector('meta[name="theme-color"]');
    let fadeTimer = 0;

    function picture(theme, index) {
        return THEMES[theme].prefix + '-' + ((index % 4) + 1) + '.jpg';
    }

    function apply(theme, animate) {
        if (!THEMES[theme]) {
            theme = 'ember';
        }

        
        if (animate && root.dataset.motion !== 'off') {
            root.classList.add('theme-fade');
            clearTimeout(fadeTimer);
            fadeTimer = setTimeout(function () {
                root.classList.remove('theme-fade');
            }, 600);
        }

        root.dataset.theme = theme;

        if (metaColor) {
            metaColor.setAttribute('content', THEMES[theme].color);
        }

        
        frames.forEach(function (img, i) {
            img.src = picture(theme, i);
        });
        rows.forEach(function (row, i) {
            row.dataset.img = picture(theme, i);
            new Image().src = row.dataset.img; 
        });

        document.querySelectorAll('[data-swap]').forEach(function (img) {
            img.src = picture(theme, Number(img.dataset.swap));
        });

        buttons.forEach(function (button) {
            button.setAttribute('aria-pressed', String(button.dataset.themeSet === theme));
        });
    }

    buttons.forEach(function (button) {
        button.addEventListener('click', function () {
            const theme = button.dataset.themeSet;
            apply(theme, true);
            try {
                localStorage.setItem('theme', theme);
            } catch (e) {
                
            }
        });
    });

    apply(root.dataset.theme, false); 
})();






(function () {
    const root = document.documentElement;
    const bar = document.querySelector('.progress span');
    const parallaxItems = Array.from(document.querySelectorAll('[data-parallax]'));
    const section = document.querySelector('.hscroll');
    const pin = section ? section.querySelector('.hscroll__pin') : null;
    const track = section ? section.querySelector('.hscroll__track') : null;
    const fill = section ? section.querySelector('.hscroll__bar span') : null;
    const cube = document.querySelector('[data-cube]');

    let ticking = false;
    let lastWidth = 0;
    let slide = null; 

    function motionOff() {
        return root.dataset.motion === 'off';
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    
    function measure() {
        if (!section) {
            return;
        }

        if (motionOff()) {
            section.classList.remove('is-pinned');
            section.style.removeProperty('--hs-height');
            slide = null;
            return;
        }

        section.classList.add('is-pinned');
        const distance = Math.max(track.scrollWidth - pin.clientWidth, 0);
        section.style.setProperty('--hs-height', distance + pin.offsetHeight + 'px');
        slide = { top: section.getBoundingClientRect().top + window.scrollY, distance: distance };
    }

    function reset() {
        if (track) { track.style.transform = ''; }
        if (fill) { fill.style.transform = ''; }
        if (cube) { cube.style.transform = ''; }
        parallaxItems.forEach(function (el) { el.style.transform = ''; });
    }

    function update() {
        ticking = false;
        const y = window.scrollY;
        const vh = window.innerHeight;

        
        const max = root.scrollHeight - vh;
        bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';

        if (motionOff()) {
            reset();
            return;
        }

        
        if (slide && slide.distance > 0) {
            const p = clamp((y - slide.top) / slide.distance, 0, 1);
            track.style.transform = 'translate3d(' + (-p * slide.distance) + 'px,0,0)';
            fill.style.transform = 'scaleX(' + p + ')';
        }

        
        
        parallaxItems.forEach(function (el) {
            const rect = el.parentElement.getBoundingClientRect();
            if (rect.bottom < -200 || rect.top > vh + 200) {
                return;
            }
            const offset = rect.top + rect.height / 2 - vh / 2;
            el.style.transform = 'translate3d(0,' + (offset * -Number(el.dataset.parallax)) + 'px,0)';
        });

        
        if (cube) {
            const rect = cube.parentElement.parentElement.getBoundingClientRect();
            const p = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
            cube.style.transform = 'rotateX(' + (-22 + p * 180) + 'deg) rotateY(' + (-32 + p * 360) + 'deg)';
        }
    }

    function request() {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }

    function remeasure() {
        measure();
        request();
    }

    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', function () {
        
        if (window.innerWidth !== lastWidth) {
            lastWidth = window.innerWidth;
            remeasure();
        }
    });

    
    new MutationObserver(function () {
        setTimeout(remeasure, 120);
    }).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-motion'] });

    lastWidth = window.innerWidth;
    remeasure();
    window.addEventListener('load', remeasure);
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(remeasure);
    }
})();
