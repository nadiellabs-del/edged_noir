/* ==========================================================================
 * POSTER REEL: fila curva de posters en 3D + ventana de detalle
 * --------------------------------------------------------------------------
 * Versión en JavaScript puro del componente "TiltedGridHero" (React).
 * Una fila de posters gira por dentro de un cilindro: el centro se ve
 * plano y los extremos se curvan hacia la cámara y se desvanecen.
 *
 * Cada poster se corta en SLICES franjas verticales; cada franja es una
 * cara plana del cilindro. La tarjeta completa se mueve con una sola
 * animación (rotateY alrededor del eje del cilindro), así que las franjas
 * nunca se separan. Cada poster conserva su proporción: todos tienen el
 * mismo alto y cada uno su propio ancho, sin recortes.
 *
 * La fila gira sola, se detiene con el mouse encima y se puede mover
 * arrastrando con clic sostenido o deslizando el dedo en el celular.
 *
 * Para agregar o editar posters, modifica el arreglo POSTERS.
 * ========================================================================== */
(function () {
    'use strict';

    const POSTERS = [
        {
            code: 'EN-P01',
            src: 'img/everdayImHustlin.jpg',
            title: "Everyday I'm Hustlin",
            quote: "If I don't, who will?",
            description: 'Red engraved figures of death swirl behind a gothic title. The clock never stops, so neither do you. A piece for the ones who build in silence and treat every single day as the one that counts.',
            tags: ['Discipline', 'Grind', 'Mortality']
        },
        {
            code: 'EN-P02',
            src: 'img/intothevoid.jpg',
            title: 'Into the Void',
            quote: "The void isn't scary. It's raw freedom.",
            description: 'A skull pierced by nails over blood red. In the abyss there are no rules and no masters, only noise. This is punk at its core: a scream against silence, a pulse in the dark.',
            tags: ['Punk', 'Freedom', 'Rebellion']
        },
        {
            code: 'EN-P03',
            src: 'img/edged is rhythm-poster.jpg',
            title: 'Edged is Rhythm',
            quote: 'The world is noise. Carved by chaos, shaped by rhythm.',
            description: 'A red record sealed in plastic, framed by thorned wings. Everything around you is noise, and the only way through it is finding your own beat. Built to disrupt, out of this world.',
            tags: ['Music', 'Chaos', 'Identity']
        },
        {
            code: 'EN-P04',
            src: 'img/You cannot rule the world.jpg',
            title: 'You Cannot Rule the World',
            quote: 'But you can rule your mind.',
            description: 'The Earth trapped inside a crown of barbed wire, under burning letters. Control over the world is an illusion. Control over yourself is not. Mindset is everything.',
            tags: ['Mindset', 'Control', 'Power']
        },
        {
            code: 'EN-P05',
            src: 'img/sinners-paradise-poster.jpg',
            title: 'Sinners Paradise',
            quote: 'Where angels fear to tread, we build empires.',
            description: 'A hand holds the apple while the serpent rises beside it. They told us perfection was the way, but we chose truth with all its chaos. Welcome to the kingdom of the imperfect. Made in hell, worn in heaven.',
            tags: ['Temptation', 'Imperfection', 'Truth']
        },
        {
            // Copia optimizada para web del archivo original de 13 MB
            code: 'EN-P06',
            src: 'img/entropy-of-grace-poster-web.jpg',
            title: 'Entropy of Grace',
            quote: "Life doesn't break. It turns into chaos.",
            description: 'Medieval woodcuts of the dance of death meet a figure wrapped in light. Beauty and grace do not come from perfection, they grow out of chaos and imperfection. That is what makes them unique.',
            tags: ['Chaos', 'Beauty', 'Life & Death']
        },
        {
            code: 'EN-P07',
            src: 'img/ATARAXIA.jpg',
            title: 'Ataraxia',
            quote: 'Stillness is strength.',
            description: 'A ribcage guarding a red heart. True strength is not loud, it is silent. While the world chases noise and reaction, you protect your peace. Discipline over drama. Balance of mind and heart.',
            tags: ['Serenity', 'Balance', 'Self-control']
        },
        {
            code: 'EN-P08',
            src: 'img/shadows.jpg',
            title: 'Shadows',
            quote: "Look within yourself carefully, and you'll see your deepest.",
            description: 'An engraved creature rising from the dark: the parts of yourself you would rather not see. Facing your shadows is not weakness, it is the only way to grow. Raw style, real presence.',
            tags: ['Introspection', 'Fear', 'Growth']
        },
        {
            code: 'EN-P09',
            src: 'img/overwhelmed.jpg',
            title: 'Overwhelmed by the System',
            quote: 'Were we really born for this?',
            description: 'A chained bear trap under a crosshair. The routine, the pressure, the cage we are told to call normal. A question thrown back at the system that keeps us running in circles.',
            tags: ['Society', 'Critique', 'Pressure']
        },
        {
            code: 'EN-P10',
            src: 'img/burneverthing.jpg',
            title: 'Burn Everything',
            quote: "But don't forget the beauty of life.",
            description: 'A bottle filled with roses, set on blue fire. Burn what holds you back, the fear, the noise, the expectations, but keep what makes life worth living. Destruction and beauty in the same frame.',
            tags: ['Rebellion', 'Beauty', 'Renewal']
        },
        {
            code: 'EN-P11',
            src: 'img/demon.jpg',
            title: 'Angel or Demon',
            quote: 'Is there anything more dangerous than those beautiful eyes?',
            description: 'A face in chainmail, eyes closed, crowned with blades. Beauty can be a weapon and peace can hide a storm. A study in duality, where the line between angel and demon disappears. Enjoy the pain.',
            tags: ['Duality', 'Desire', 'Danger']
        },
        // EN-P12 ("Trying to Stay Alive") se retiró: usaba material de Requiem for a Dream.
        // No reutilizar ese código para otro poster.
        {
            code: 'EN-P13',
            src: 'img/every battle-streetwear-poster.jpg',
            title: 'Every Battle',
            quote: "Isn't meant to be won, but every lesson counts.",
            description: 'A knight’s helmet wrapped in flames. Not every fight ends in victory, and it does not have to. Growth hides in the lessons of the struggle.',
            tags: ['Growth', 'Struggle', 'Lessons']
        }
    ];

    // ---- Ajustes del efecto (equivalentes a las props del componente React) ----
    const OPTIONS = {
        speed: 4,          // segundos para que la fila avance un poster (promedio)
        tileHeight: 56,    // alto de los posters, % del alto de la sección
        gap: 8,            // espacio entre posters, % del alto del poster
        axis: 56,          // centro vertical de la fila, % del alto de la sección
        curve: 62,         // cuánto se curvan los extremos (5 a 85 grados)
        fade: 12           // ancho del desvanecido en cada lado, % del ancho
    };

    const SLICES = 16;          // franjas por poster
    const OVERLAP = 3;          // px que cada franja se monta sobre sus vecinas (evita líneas entre franjas)
    const CAMERA = 1.6;         // distancia de la cámara, en radios del cilindro
    const MAX_WIDTH = 55;       // el poster más ancho nunca ocupa más de este % del ancho
    const DEFAULT_ASPECT = 0.8; // si una imagen no carga, se usa 4:5
    const DRAG_THRESHOLD = 6;   // px que hay que mover para que cuente como arrastre y no como clic
    const MAX_FLING = 25;       // velocidad máxima al soltar, en veces la velocidad normal

    const fmt = (n) => +n.toFixed(4);
    const deg = (rad) => (rad * 180) / Math.PI;
    const mod = (n, m) => ((n % m) + m) % m;

    /** Radio del cilindro (fracción del ancho) que pone el borde a `bend` radianes. */
    function arc(bend) {
        return (CAMERA - 1 + Math.cos(bend)) / (2 * CAMERA * Math.sin(bend));
    }

    /** Lee la proporción real (ancho / alto) de cada poster. */
    function loadAspects() {
        return Promise.all(POSTERS.map((p) => new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img.naturalWidth && img.naturalHeight
                ? img.naturalWidth / img.naturalHeight
                : DEFAULT_ASPECT);
            img.onerror = () => resolve(DEFAULT_ASPECT);
            img.src = p.src;
        })));
    }

    /**
     * Distribuye los posters en el cilindro. Todos tienen el mismo alto
     * (quedan alineados arriba y abajo) y cada uno su propio ancho según
     * su proporción, así que ninguno se recorta.
     * Devuelve, en grados: `unit` = arco de un alto de poster, `sweep` =
     * mitad del recorrido del bucle, `limit` = hasta dónde se ve un poster.
     */
    function measure(width, height, bend, aspects) {
        const { tileHeight, gap } = OPTIONS;
        const aMax = Math.max(...aspects);
        const h = Math.min((tileHeight / 100) * height, ((MAX_WIDTH / 100) * width) / aMax);
        const radius = width * arc(bend);
        if (!(h > 0) || !(radius > 0)) return null;
        const unit = deg(h / radius);
        const setArc = aspects.reduce((s, a) => s + (a + gap / 100) * unit, 0);
        const limit = deg(bend) + (aMax * unit) / 2;
        // El bucle debe ser más largo que la parte visible, para que cada
        // poster dé la vuelta fuera de la vista. Si no alcanza, se repite la lista.
        const copies = Math.min(6, Math.max(1, Math.ceil((2 * limit) / setArc)));
        const sweep = fmt((setArc * copies) / 2);
        return { unit: fmt(unit), copies, sweep, limit: fmt(Math.min(sweep, limit)) };
    }

    function initReel(openModal) {
        const root = document.getElementById('posterReel');
        const band = root ? root.querySelector('.poster-band') : null;
        if (!root || !band || !('ResizeObserver' in window) || !Element.prototype.animate) return;

        const { speed, tileHeight, gap, axis, fade } = OPTIONS;
        const bend = (Math.min(85, Math.max(5, OPTIONS.curve)) * Math.PI) / 180;
        const r = 100 * arc(bend);
        const radius = `${+r.toFixed(3)}cqw`;
        const turn = (d) => `translateZ(${radius}) rotateY(${fmt(d)}deg) translateZ(-${radius})`;

        band.style.perspective = `${+(r * CAMERA).toFixed(3)}cqw`;
        band.style.perspectiveOrigin = `50% ${axis}%`;
        const mask = `linear-gradient(90deg, transparent, #000 ${fade}%, #000 ${100 - fade}%, transparent)`;
        band.style.maskImage = mask;
        band.style.webkitMaskImage = mask;

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        loadAspects().then((aspects) => {
            const aMax = Math.max(...aspects);
            const avg = aspects.reduce((s, a) => s + a, 0) / aspects.length;
            // Toda medida es un múltiplo del alto del poster
            const u = (n) => `calc(${fmt(n)} * min(${tileHeight}cqh, ${fmt(MAX_WIDTH / aMax)}cqw))`;

            // ---- Estado del movimiento ----
            // La fila tiene un reloj propio (`clock`, en segundos). Avanzar el
            // reloj mueve todos los posters a la vez; arrastrar lo adelanta o
            // lo atrasa. Así el giro automático y el arrastre nunca se pelean.
            let current = null;     // medidas actuales
            let tiles = [];         // { anim, offset } por cada poster en pantalla
            let duration = 1;       // segundos de una vuelta completa
            let degPerSecond = 1;   // grados que avanza la fila por segundo de reloj
            let clock = 0;
            let rate = 1;           // 1 = velocidad normal, 0 = detenido
            let hovering = false;
            let lastFrame = performance.now();

            // Arrastre
            let pointerId = null;
            let dragging = false;
            let suppressClick = false;
            let startX = 0, lastX = 0, lastT = 0, dragRate = 0;

            function build(layout) {
                const { unit, copies, sweep, limit } = layout;
                const total = 2 * sweep;
                const hide = Math.max(0, (sweep - limit) / (total || 1));
                const eps = 0.00001;

                // Fuera de `limit` el poster no se ve, así que se oculta (ahí es donde da la vuelta)
                const keyframes = [
                    { offset: 0, transform: turn(-sweep), visibility: 'hidden' },
                    { offset: hide, visibility: 'hidden' },
                    { offset: Math.min(hide + eps, 0.5), visibility: 'visible' },
                    { offset: Math.max(1 - hide - eps, 0.5), visibility: 'visible' },
                    { offset: 1 - hide, visibility: 'hidden' },
                    { offset: 1, transform: turn(sweep), visibility: 'hidden' }
                ];

                // Misma velocidad que antes: `speed` segundos por poster promedio
                const newDuration = ((total / unit) / (avg + gap / 100)) * speed;
                // Conserva la posición relativa al cambiar el tamaño de la ventana
                clock = (clock / duration) * newDuration;
                duration = newDuration;
                degPerSecond = total / duration;

                const frag = document.createDocumentFragment();
                const nextTiles = [];
                let pos = 0; // arco recorrido hasta el borde del poster actual

                for (let c = 0; c < copies; c++) {
                    POSTERS.forEach((poster, i) => {
                        const a = aspects[i];
                        const center = pos + (a * unit) / 2;
                        pos += (a + gap / 100) * unit;
                        const share = a / SLICES;

                        const tile = document.createElement('div');
                        tile.className = 'poster-tile';
                        tile.dataset.idx = String(i);
                        tile.title = poster.title;
                        Object.assign(tile.style, {
                            left: `calc(50% - ${u(a / 2)})`,
                            top: `calc(${axis}% - ${u(0.5)})`,
                            width: u(a),
                            height: u(1)
                        });

                        for (let k = 0; k < SLICES; k++) {
                            const strip = document.createElement('div');
                            strip.className = 'poster-strip' +
                                (k === 0 ? ' is-first' : '') +
                                (k === SLICES - 1 ? ' is-last' : '');
                            // Cada franja se monta OVERLAP px sobre sus vecinas por ambos lados.
                            // Cerca de los bordes el poster se curva hacia la cámara y se agranda,
                            // y una unión exacta dejaba ver una línea del fondo entre franjas.
                            // Los bordes exteriores del poster no se ensanchan.
                            const extL = k === 0 ? 0 : OVERLAP;
                            const extR = k === SLICES - 1 ? 0 : OVERLAP;
                            Object.assign(strip.style, {
                                left: `calc(${u((a - share) / 2)} - ${extL}px)`,
                                width: `calc(${u(share)} + ${extL + extR}px)`,
                                height: u(1),
                                // El giro se hace desde el centro real de la franja, no de la caja ensanchada
                                transformOrigin: `calc(${extL}px + ${u(share / 2)}) 50%`,
                                transform: turn((a / 2 - (k + 0.5) * share) * unit)
                            });
                            const img = document.createElement('img');
                            img.src = poster.src;
                            img.alt = '';
                            img.draggable = false;
                            // La imagen completa mide exactamente lo que el poster: no se recorta
                            Object.assign(img.style, {
                                left: `calc(${u(-k * share)} + ${extL}px)`,
                                width: u(a),
                                height: u(1)
                            });
                            strip.appendChild(img);
                            tile.appendChild(strip);
                        }

                        tile.addEventListener('click', () => {
                            if (suppressClick) return;
                            openModal(i);
                        });

                        frag.appendChild(tile);
                        // El primer poster de la lista va más adelante, así entran en orden
                        nextTiles.push({ tile, offset: ((total - center) / total) * duration });
                    });
                }

                tiles.forEach((t) => t.anim.cancel());
                band.replaceChildren(frag);

                tiles = nextTiles.map(({ tile, offset }) => {
                    const anim = tile.animate(keyframes, {
                        duration: duration * 1000,
                        iterations: Infinity,
                        easing: 'linear'
                    });
                    anim.pause();
                    return { anim, offset };
                });
                render();
            }

            function render() {
                const ms = duration * 1000;
                for (const t of tiles) {
                    t.anim.currentTime = mod((clock + t.offset) * 1000, ms);
                }
            }

            function frame(now) {
                const dt = Math.min((now - lastFrame) / 1000, 0.05); // sin saltos al volver a la pestaña
                lastFrame = now;
                if (!dragging && tiles.length) {
                    const target = (hovering || reducedMotion.matches) ? 0 : 1;
                    // Frena / acelera / pierde la inercia de forma suave
                    rate += (target - rate) * (1 - Math.exp(-dt * 2.5));
                    clock = mod(clock + rate * dt, duration);
                    render();
                }
                requestAnimationFrame(frame);
            }

            // Píxeles arrastrados → segundos de reloj. En el centro de la fila,
            // mover el dedo X píxeles gira el cilindro X / radio radianes.
            function pxToSeconds(dx) {
                const radiusPx = root.clientWidth * arc(bend);
                return -deg(dx / radiusPx) / degPerSecond;
            }

            // ---- Arrastre con mouse (clic sostenido) y con el dedo ----
            root.addEventListener('pointerdown', (e) => {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                if (e.target.closest('.poster-reel-a11y')) return;
                pointerId = e.pointerId;
                dragging = false;
                suppressClick = false;
                startX = lastX = e.clientX;
                lastT = performance.now();
                dragRate = 0;
            });

            root.addEventListener('pointermove', (e) => {
                if (e.pointerType === 'mouse') {
                    hovering = !!e.target.closest('.poster-tile');
                }
                if (e.pointerId !== pointerId) return;

                if (!dragging) {
                    if (Math.abs(e.clientX - startX) < DRAG_THRESHOLD) return;
                    // Ya es un arrastre: se captura el puntero hasta soltar
                    dragging = true;
                    suppressClick = true;
                    root.classList.add('is-dragging');
                    try { root.setPointerCapture(e.pointerId); } catch (err) { /* ignorado */ }
                    lastX = e.clientX;
                    lastT = performance.now();
                    return;
                }

                const now = performance.now();
                const dx = e.clientX - lastX;
                const dtMove = Math.max((now - lastT) / 1000, 0.001);
                const step = pxToSeconds(dx);
                clock = mod(clock + step, duration);
                // Velocidad suavizada para que la inercia no dé tirones
                dragRate = dragRate * 0.6 + (step / dtMove) * 0.4;
                lastX = e.clientX;
                lastT = now;
                render();
            });

            function endDrag(e) {
                if (e.pointerId !== pointerId) return;
                pointerId = null;
                if (!dragging) return;
                dragging = false;
                root.classList.remove('is-dragging');
                // Si se quedó quieto antes de soltar, no hay inercia
                if (performance.now() - lastT > 100) dragRate = 0;
                rate = Math.max(-MAX_FLING, Math.min(MAX_FLING, dragRate));
                // El clic que llega justo después de soltar no abre la ventana
                setTimeout(() => { suppressClick = false; }, 0);
            }
            root.addEventListener('pointerup', endDrag);
            root.addEventListener('pointercancel', endDrag);
            root.addEventListener('pointerleave', (e) => {
                if (e.pointerType === 'mouse') hovering = false;
            });

            const ro = new ResizeObserver(([entry]) => {
                const { width, height } = entry.contentRect;
                const next = measure(width, height, bend, aspects);
                if (!next) return;
                if (current &&
                    current.copies === next.copies &&
                    current.sweep === next.sweep &&
                    current.unit === next.unit) return;
                current = next;
                build(next);
                band.classList.add('is-ready');
            });
            ro.observe(root);

            requestAnimationFrame(frame);
        });
    }

    // ---------------------------------------------------------------------
    // Ventana de detalle
    // ---------------------------------------------------------------------
    function initModal() {
        const modal = document.getElementById('posterModal');
        if (!modal) return () => {};

        const img = document.getElementById('posterModalImg');
        const count = document.getElementById('posterModalCount');
        const title = document.getElementById('posterModalTitle');
        const quote = document.getElementById('posterModalQuote');
        const desc = document.getElementById('posterModalDesc');
        const tags = document.getElementById('posterModalTags');
        const closeBtn = modal.querySelector('.poster-modal-close');
        let index = 0;
        let lastFocus = null;

        // ---- Compra (usa shop.js; si no está cargado, no se muestra) ----
        const shop = () => window.EdgedShop;
        let buyBox = null;
        let size = '18x24';

        function ensureBuyBox() {
            if (buyBox || !shop()) return;
            buyBox = document.createElement('div');
            buyBox.className = 'poster-buy';
            buyBox.innerHTML = `
                <p class="shop-label">Size</p>
                <div class="shop-sizes" role="radiogroup" aria-label="Poster size"></div>
                <span class="shop-price-now"></span>
                <div class="shop-actions">
                    <button type="button" class="shop-btn shop-btn--solid" data-act="add">Add to Cart</button>
                    <button type="button" class="shop-btn" data-act="buy">Buy Now</button>
                </div>`;
            tags.after(buyBox);
            buyBox.querySelector('[data-act="add"]').addEventListener('click', () => {
                const item = cartItem();
                close();
                shop().add(item);
            });
            buyBox.querySelector('[data-act="buy"]').addEventListener('click', () => {
                const item = cartItem();
                close();
                shop().buyNow(item);
            });
        }

        const sizeInfo = () => shop().PRICES.posterSizes.find((s) => s.id === size) || shop().PRICES.posterSizes[0];

        function cartItem() {
            const p = POSTERS[index];
            const s = sizeInfo();
            return {
                id: p.code, title: `${p.title} Poster`, variant: s.id,
                variantLabel: s.label, price: s.price, image: p.src
            };
        }

        function renderBuy() {
            ensureBuyBox();
            if (!buyBox) return;
            const sizes = shop().PRICES.posterSizes;
            const priceEl = buyBox.querySelector('.shop-price-now');
            const update = () => { priceEl.textContent = shop().money(sizeInfo().price); };
            shop().renderSizes(buyBox.querySelector('.shop-sizes'), sizes, size, (s) => { size = s; update(); });
            update();
        }

        function render() {
            const p = POSTERS[index];
            img.src = p.src;
            img.alt = `${p.title} poster`;
            count.textContent = `${p.code} · Poster ${String(index + 1).padStart(2, '0')} / ${String(POSTERS.length).padStart(2, '0')}`;
            title.textContent = p.title;
            quote.textContent = p.quote;
            desc.textContent = p.description;
            tags.replaceChildren(...p.tags.map((t) => {
                const s = document.createElement('span');
                s.textContent = t;
                return s;
            }));
            renderBuy();
            if (shop() && !modal.hidden) shop().route.set('poster', p.code);
        }

        function open(i) {
            if (!Number.isFinite(i)) return;
            index = i;
            modal.hidden = false;
            render();
            lastFocus = document.activeElement;
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => modal.classList.add('is-open'));
            closeBtn.focus();
        }

        function close() {
            modal.classList.remove('is-open');
            document.body.style.overflow = '';
            setTimeout(() => { modal.hidden = true; }, 300);
            if (shop()) shop().route.set('poster', null);
            if (lastFocus && lastFocus.focus) lastFocus.focus();
        }

        function step(dir) {
            index = (index + dir + POSTERS.length) % POSTERS.length;
            render();
        }

        // Si la dirección trae un código (edgednoir.com/poster/EN-P03), abre ese poster
        if (shop()) {
            const code = shop().route.read('poster');
            const found = code ? POSTERS.findIndex((p) => p.code === code) : -1;
            if (found >= 0) setTimeout(() => open(found), 0);
        }

        modal.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
        document.getElementById('posterPrev').addEventListener('click', () => step(-1));
        document.getElementById('posterNext').addEventListener('click', () => step(1));

        document.addEventListener('keydown', (e) => {
            if (modal.hidden) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowLeft') step(-1);
            if (e.key === 'ArrowRight') step(1);
        });

        return open;
    }

    // Botones ocultos para navegar con teclado / lector de pantalla
    function initA11yList(openModal) {
        const list = document.getElementById('posterReelList');
        if (!list) return;
        POSTERS.forEach((p, i) => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = `View poster: ${p.title}`;
            btn.addEventListener('click', () => openModal(i));
            li.appendChild(btn);
            list.appendChild(li);
        });
    }

    function init() {
        const openModal = initModal();
        initReel(openModal);
        initA11yList(openModal);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
