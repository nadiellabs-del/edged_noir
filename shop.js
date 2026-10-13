/* ==========================================================================
 * EDGED NOIR SHOP: carrito + vista rápida + compra en Amazon
 * --------------------------------------------------------------------------
 * - El carrito se guarda en el navegador (localStorage) y se comparte entre
 *   todas las páginas que cargan este archivo.
 * - El ícono del carrito del header abre el panel del carrito.
 * - "Checkout on Amazon" envía todos los productos al carrito de Amazon
 *   usando sus ASIN (el código de producto de Amazon).
 * - "Buy Now" abre directamente la página del producto en Amazon.
 *
 * CÓMO CONECTAR AMAZON:
 *   Cuando cada producto esté publicado en Amazon, copia su ASIN en
 *   CONFIG.asins usando la clave "<id del producto>:<variante>".
 *   Ejemplos de claves:
 *     'poster-into-the-void:18x24'
 *     'tee-ataraxia:M'
 *   Mientras un producto no tenga ASIN, se puede agregar al carrito pero el
 *   pago en Amazon aparece como "próximamente".
 * ========================================================================== */
(function () {
    'use strict';

    const CONFIG = {
        amazonDomain: 'www.amazon.com',
        associateTag: '', // opcional: tu tag de Amazon Associates
        asins: {
            // 'poster-into-the-void:18x24': 'B0XXXXXXXX',
            // 'tee-ataraxia:M': 'B0XXXXXXXX',
        }
    };

    // Precios (USD). Referencias: Brain Dead vende camisetas gráficas a $54 y
    // Hellstar a $120; con impresión bajo demanda se recomienda quedar por
    // debajo para que el margen después de comisiones siga siendo sano.
    const PRICES = {
        posterSizes: [
            { id: '12x18', label: '12 × 18 in', price: 29.99 },
            { id: '18x24', label: '18 × 24 in', price: 44.99 }
        ],
        apparelSizes: ['S', 'M', 'L', 'XL', 'XXL']
    };

    const STORAGE_KEY = 'edgednoir-cart-v1';

    // ---------------------------------------------------------------------
    // Direcciones con código de producto
    //   En el hosting (direcciones limpias):  /men/EN-T01   /poster/EN-P03
    //   Abriendo los archivos en el computador: men.html?p=EN-T01
    // La versión para el hosting marca <html data-clean-urls="true">.
    // ---------------------------------------------------------------------
    const CLEAN_URLS = document.documentElement.dataset.cleanUrls === 'true';
    const ROUTE_SEGMENT = { poster: 'poster', tee: 'men' };

    function routePattern(kind) {
        return new RegExp(`/${ROUTE_SEGMENT[kind]}/([A-Za-z0-9-]+)/?$`);
    }

    // Dirección de la página sin el código (a dónde volver al cerrar)
    const homePath = (() => {
        let p = location.pathname;
        Object.keys(ROUTE_SEGMENT).forEach((k) => {
            if (k === 'tee') p = p.replace(/\/men\/[A-Za-z0-9-]+\/?$/, '/men');
            else p = p.replace(routePattern(k), '/');
        });
        return p.replace(/\/{2,}/g, '/') || '/';
    })();

    const route = {
        read(kind) {
            const m = location.pathname.match(routePattern(kind));
            if (m) return m[1].toUpperCase();
            const q = new URLSearchParams(location.search).get('p');
            return q ? q.toUpperCase() : null;
        },
        set(kind, code) {
            let url;
            if (CLEAN_URLS) url = code ? `/${ROUTE_SEGMENT[kind]}/${code}` : homePath;
            else url = code ? `${location.pathname}?p=${encodeURIComponent(code)}` : location.pathname;
            try { history.replaceState(null, '', url); } catch (e) { /* algunos navegadores en file:// */ }
        }
    };

    // ---------------------------------------------------------------------
    // Estado del carrito
    // ---------------------------------------------------------------------
    let cart = load();

    function load() {
        try {
            const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(raw) ? raw.filter((i) => i && i.sku && i.qty > 0) : [];
        } catch (e) {
            return [];
        }
    }

    function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) { /* modo privado */ }
        renderCart();
    }

    const money = (n) => `$${Number(n).toFixed(2)}`;
    const asinFor = (sku) => (CONFIG.asins[sku] || '').trim();
    const count = () => cart.reduce((s, i) => s + i.qty, 0);
    const subtotal = () => cart.reduce((s, i) => s + i.qty * i.price, 0);

    function slugify(text) {
        return String(text)
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }

    /** item: { id, title, variant, variantLabel, price, image } */
    function add(item, qty = 1) {
        const sku = `${item.id}:${item.variant}`;
        const existing = cart.find((i) => i.sku === sku);
        if (existing) existing.qty += qty;
        else cart.push({ sku, id: item.id, title: item.title, variantLabel: item.variantLabel, price: item.price, image: item.image, qty });
        save();
        openDrawer(`${item.title} added to your cart`);
    }

    function setQty(sku, qty) {
        const it = cart.find((i) => i.sku === sku);
        if (!it) return;
        it.qty = Math.max(0, Math.min(99, qty));
        cart = cart.filter((i) => i.qty > 0);
        save();
    }

    function amazonProductUrl(asin) {
        const tag = CONFIG.associateTag ? `?tag=${encodeURIComponent(CONFIG.associateTag)}` : '';
        return `https://${CONFIG.amazonDomain}/dp/${encodeURIComponent(asin)}${tag}`;
    }

    // Formulario "Add to Cart" de Amazon: agrega varios ASIN al carrito de Amazon
    function amazonCartUrl(items) {
        const params = new URLSearchParams();
        items.forEach((it, n) => {
            params.set(`ASIN.${n + 1}`, asinFor(it.sku));
            params.set(`Quantity.${n + 1}`, String(it.qty));
        });
        if (CONFIG.associateTag) params.set('AssociateTag', CONFIG.associateTag);
        return `https://${CONFIG.amazonDomain}/gp/aws/cart/add.html?${params.toString()}`;
    }

    function buyNow(item) {
        const asin = asinFor(`${item.id}:${item.variant}`);
        if (asin) {
            window.open(amazonProductUrl(asin), '_blank', 'noopener');
        } else {
            add(item);
        }
    }

    // ---------------------------------------------------------------------
    // Panel del carrito
    // ---------------------------------------------------------------------
    let drawer, overlay, listEl, subtotalEl, checkoutBtn, noteEl, toastEl, floatBtn, lastFocus;

    function el(tag, cls, html) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html != null) e.innerHTML = html;
        return e;
    }

    function buildDrawer() {
        overlay = el('div', 'cart-overlay');
        overlay.addEventListener('click', closeDrawer);

        drawer = el('aside', 'cart-drawer');
        drawer.setAttribute('role', 'dialog');
        drawer.setAttribute('aria-modal', 'true');
        drawer.setAttribute('aria-label', 'Shopping cart');
        drawer.innerHTML = `
            <div class="cart-head">
                <h2 class="cart-title">Your Cart</h2>
                <button type="button" class="cart-close" aria-label="Close cart">&#10005;</button>
            </div>
            <p class="cart-toast" aria-live="polite"></p>
            <ul class="cart-list"></ul>
            <div class="cart-foot">
                <div class="cart-subtotal"><span>Subtotal</span><strong></strong></div>
                <p class="cart-small">Printed on demand. Shipping and taxes are calculated at checkout.</p>
                <button type="button" class="cart-checkout"></button>
                <p class="cart-note"></p>
            </div>`;

        listEl = drawer.querySelector('.cart-list');
        subtotalEl = drawer.querySelector('.cart-subtotal strong');
        checkoutBtn = drawer.querySelector('.cart-checkout');
        noteEl = drawer.querySelector('.cart-note');
        toastEl = drawer.querySelector('.cart-toast');
        drawer.querySelector('.cart-close').addEventListener('click', closeDrawer);

        checkoutBtn.addEventListener('click', () => {
            if (!cart.length) return;
            const missing = cart.filter((i) => !asinFor(i.sku));
            if (missing.length) return;
            window.open(amazonCartUrl(cart), '_blank', 'noopener');
        });

        listEl.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-sku]');
            if (!btn) return;
            const sku = btn.dataset.sku;
            const it = cart.find((i) => i.sku === sku);
            if (!it) return;
            if (btn.dataset.act === 'inc') setQty(sku, it.qty + 1);
            if (btn.dataset.act === 'dec') setQty(sku, it.qty - 1);
            if (btn.dataset.act === 'remove') setQty(sku, 0);
        });

        document.body.append(overlay, drawer);

        // Botón flotante (celular, donde el ícono del header está oculto)
        floatBtn = el('button', 'cart-float', '<i class="fas fa-shopping-bag" aria-hidden="true"></i><span class="cart-badge"></span>');
        floatBtn.type = 'button';
        floatBtn.setAttribute('aria-label', 'Open cart');
        floatBtn.addEventListener('click', () => openDrawer());
        document.body.appendChild(floatBtn);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
        });
    }

    function renderCart() {
        if (!drawer) return;
        const n = count();
        document.querySelectorAll('.cart-badge').forEach((b) => {
            b.textContent = n > 99 ? '99+' : String(n);
            b.hidden = n === 0;
        });
        floatBtn.classList.toggle('has-items', n > 0);

        if (!cart.length) {
            listEl.innerHTML = '<li class="cart-empty">Your cart is empty.</li>';
        } else {
            listEl.innerHTML = cart.map((i) => `
                <li class="cart-item">
                    <img src="${escapeAttr(i.image)}" alt="">
                    <div class="cart-item-info">
                        <p class="cart-item-title">${escapeHtml(i.title)}</p>
                        <p class="cart-item-variant">${escapeHtml(i.variantLabel)}</p>
                        <div class="cart-qty">
                            <button type="button" data-sku="${escapeAttr(i.sku)}" data-act="dec" aria-label="Decrease quantity">&minus;</button>
                            <span>${i.qty}</span>
                            <button type="button" data-sku="${escapeAttr(i.sku)}" data-act="inc" aria-label="Increase quantity">+</button>
                        </div>
                    </div>
                    <div class="cart-item-side">
                        <span class="cart-item-price">${money(i.price * i.qty)}</span>
                        <button type="button" class="cart-remove" data-sku="${escapeAttr(i.sku)}" data-act="remove">Remove</button>
                    </div>
                </li>`).join('');
        }

        subtotalEl.textContent = money(subtotal());
        const missing = cart.filter((i) => !asinFor(i.sku)).length;
        const ready = cart.length > 0 && missing === 0;
        checkoutBtn.disabled = !ready;
        checkoutBtn.innerHTML = ready
            ? 'Checkout on Amazon <i class="fas fa-arrow-right" aria-hidden="true"></i>'
            : 'Checkout on Amazon';
        noteEl.textContent = cart.length && missing
            ? 'Amazon checkout is coming soon for some items in your cart.'
            : '';
    }

    function openDrawer(message) {
        if (!drawer) return;
        lastFocus = document.activeElement;
        toastEl.textContent = message || '';
        drawer.classList.add('is-open');
        overlay.classList.add('is-open');
        document.documentElement.classList.add('cart-locked');
        drawer.querySelector('.cart-close').focus();
    }

    function closeDrawer() {
        drawer.classList.remove('is-open');
        overlay.classList.remove('is-open');
        document.documentElement.classList.remove('cart-locked');
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    // Convierte el ícono del carrito del header en un botón con contador
    function bindHeaderIcons() {
        document.querySelectorAll('.header-icons .fa-shopping-cart').forEach((icon) => {
            if (icon.closest('.cart-trigger')) return;
            const btn = el('button', 'cart-trigger');
            btn.type = 'button';
            btn.setAttribute('aria-label', 'Open cart');
            icon.replaceWith(btn);
            btn.appendChild(icon);
            btn.appendChild(el('span', 'cart-badge'));
            btn.addEventListener('click', () => openDrawer());
        });
    }

    // ---------------------------------------------------------------------
    // Vista rápida de camisetas / hoodies (tallas + comprar)
    // ---------------------------------------------------------------------
    let qv;

    function buildQuickView() {
        qv = el('div', 'shop-qv');
        qv.hidden = true;
        qv.setAttribute('role', 'dialog');
        qv.setAttribute('aria-modal', 'true');
        qv.setAttribute('aria-labelledby', 'shopQvTitle');
        qv.innerHTML = `
            <div class="shop-qv-backdrop" data-close></div>
            <div class="shop-qv-panel">
                <button type="button" class="shop-qv-close" data-close aria-label="Close">&#10005;</button>
                <div class="shop-qv-media"><img alt=""><div class="shop-qv-thumbs"></div></div>
                <div class="shop-qv-body">
                    <h3 class="shop-qv-title" id="shopQvTitle"></h3>
                    <p class="shop-qv-price"></p>
                    <p class="shop-qv-label">Size</p>
                    <div class="shop-sizes" role="radiogroup" aria-label="Size"></div>
                    <div class="shop-actions">
                        <button type="button" class="shop-btn shop-btn--solid" data-act="add">Add to Cart</button>
                        <button type="button" class="shop-btn" data-act="buy">Buy Now</button>
                    </div>
                    <ul class="shop-qv-details">
                        <li>Oversized heavyweight fit</li>
                        <li>Printed on demand just for you</li>
                        <li>Sold and shipped through Amazon</li>
                    </ul>
                </div>
            </div>`;
        document.body.appendChild(qv);
        qv.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeQuickView));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !qv.hidden) closeQuickView();
        });
    }

    let qvProduct = null;
    let qvSize = 'M';

    function openQuickView(product) {
        qvProduct = product;
        qvSize = 'M';
        const img = qv.querySelector('.shop-qv-media > img');
        img.src = product.images[0];
        img.alt = product.title;
        const thumbs = qv.querySelector('.shop-qv-thumbs');
        thumbs.replaceChildren(...product.images.map((src, i) => {
            const b = el('button', 'shop-qv-thumb' + (i === 0 ? ' is-active' : ''));
            b.type = 'button';
            b.setAttribute('aria-label', `View image ${i + 1}`);
            b.innerHTML = `<img src="${escapeAttr(src)}" alt="">`;
            b.addEventListener('click', () => {
                img.src = src;
                thumbs.querySelectorAll('.shop-qv-thumb').forEach((t) => t.classList.toggle('is-active', t === b));
            });
            return b;
        }));
        thumbs.hidden = product.images.length < 2;

        qv.querySelector('.shop-qv-title').textContent = product.title;
        qv.querySelector('.shop-qv-price').innerHTML = product.originalPrice
            ? `<span class="shop-price-now">${money(product.price)}</span> <s class="shop-price-was">${money(product.originalPrice)}</s>`
            : `<span class="shop-price-now">${money(product.price)}</span>`;

        renderSizes(qv.querySelector('.shop-sizes'), PRICES.apparelSizes.map((s) => ({ id: s, label: s })), qvSize, (s) => { qvSize = s; });

        const item = () => ({
            id: product.id, title: product.title, variant: qvSize,
            variantLabel: `Size ${qvSize}`, price: product.price, image: product.images[0]
        });
        qv.querySelector('[data-act="add"]').onclick = () => { closeQuickView(true); add(item()); };
        qv.querySelector('[data-act="buy"]').onclick = () => { closeQuickView(true); buyNow(item()); };

        lastFocus = document.activeElement;
        qv.hidden = false;
        document.documentElement.classList.add('cart-locked');
        requestAnimationFrame(() => qv.classList.add('is-open'));
        qv.querySelector('.shop-qv-close').focus();
        route.set('tee', product.id);
    }

    function closeQuickView(keepLock) {
        route.set('tee', null);
        qv.classList.remove('is-open');
        if (!keepLock) document.documentElement.classList.remove('cart-locked');
        setTimeout(() => { qv.hidden = true; }, 250);
        if (!keepLock && lastFocus && lastFocus.focus) lastFocus.focus();
    }

    /** Botones de talla / tamaño reutilizables */
    function renderSizes(container, options, selected, onChange) {
        container.replaceChildren(...options.map((o) => {
            const b = el('button', 'shop-size' + (o.id === selected ? ' is-active' : ''), escapeHtml(o.label));
            b.type = 'button';
            b.setAttribute('role', 'radio');
            b.setAttribute('aria-checked', String(o.id === selected));
            b.addEventListener('click', () => {
                container.querySelectorAll('.shop-size').forEach((x) => {
                    const on = x === b;
                    x.classList.toggle('is-active', on);
                    x.setAttribute('aria-checked', String(on));
                });
                onChange(o.id);
            });
            return b;
        }));
    }

    // Las tarjetas de producto (men.html) abren la vista rápida
    function bindProductCards() {
        const wanted = route.read('tee');
        document.querySelectorAll('.product-card[data-title][data-price]').forEach((card) => {
            const title = card.dataset.title;
            const images = Array.from(card.querySelectorAll('.carousel-item img, .image-container img'))
                .map((i) => i.getAttribute('src'))
                .filter((v, i, a) => v && a.indexOf(v) === i);
            const product = {
                id: card.dataset.productId || `tee-${slugify(title)}`,
                title,
                price: parseFloat(card.dataset.price),
                originalPrice: card.dataset.originalPrice ? parseFloat(card.dataset.originalPrice) : null,
                images
            };
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `${title}, ${money(product.price)}. View options`);
            card.addEventListener('click', () => openQuickView(product));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openQuickView(product); }
            });
            // Si la dirección trae el código de este producto, se abre al cargar
            if (wanted && product.id.toUpperCase() === wanted) setTimeout(() => openQuickView(product), 0);
        });
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    const escapeAttr = escapeHtml;

    // ---------------------------------------------------------------------
    // API pública (la usa poster-reel.js para la ventana de cada poster)
    // ---------------------------------------------------------------------
    window.EdgedShop = {
        PRICES,
        money,
        slugify,
        add,
        buyNow,
        renderSizes,
        route,
        openCart: () => openDrawer()
    };

    function init() {
        buildDrawer();
        buildQuickView();
        bindHeaderIcons();
        bindProductCards();
        renderCart();

        // Si el carrito cambia en otra pestaña, se actualiza aquí también
        window.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEY) { cart = load(); renderCart(); }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
