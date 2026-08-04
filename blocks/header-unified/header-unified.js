import {
    decorateBlocks,
    decorateIcons,
    decorateSections,
    getMetadata,
} from '../../scripts/aem.js';

// variant order matters: the first match wins
const VARIANTS = [
    'header-privacy',
    'header-usa',
    'header-brand',
    'header-preferences',
    'header-firm',
    'header-toyotamobility',
];

// where a variant reads its content from when it is not authored inline
const CONTENT_PATHS = {
    'header-privacy': '/nav/header-privacy',
    'header-usa': '/nav/header-usa',
    'header-brand': '/nav/header-brand',
    'header-preferences': '/nav/header-preferences',
    'header-firm': '/nav/header-firm',
    'header-toyotamobility': '/nav/header-toyotamobility',
};

/** the nav document for this page; `nav` metadata overrides the default */
function navDocPath() {
    const navMeta = getMetadata('nav');
    return navMeta ? new URL(navMeta, window.location).pathname : '/nav';
}

/** the variant named by an element's classes, with or without the `header-` prefix */
function variantFromClasses(el) {
    return VARIANTS.find((variant) => el.classList.contains(variant)
        || el.classList.contains(variant.slice('header-'.length))) || null;
}

/** the variant requested on the page, by block class or section container class */
function pageVariant(block) {
    return variantFromClasses(block)
        || VARIANTS.find((variant) => block.closest(`.${variant}-container`))
        || null;
}

async function fetchNavDoc(path) {
    const resp = await fetch(`${path}.plain.html`);
    if (!resp.ok) return null;

    const doc = document.createElement('main');
    doc.innerHTML = await resp.text();

    // re-base authored media against the nav document
    doc.querySelectorAll('img[src^="./media_"], source[srcset^="./media_"]').forEach((el) => {
        const attr = el.tagName === 'SOURCE' ? 'srcset' : 'src';
        el[attr] = new URL(el.getAttribute(attr), new URL(path, window.location)).href;
    });

    decorateIcons(doc);
    decorateSections(doc);
    decorateBlocks(doc);
    return doc;
}

const navDocs = new Map();

/**
 * Loads a nav document, memoised per path. This deliberately does not use
 * `loadFragment`, which would also *load* the blocks it finds: a `header-unified`
 * block in a nav document only declares a variant, and loading it would render a
 * second header and clear the content we still need to read.
 */
function loadNavDoc(path) {
    if (!navDocs.has(path)) navDocs.set(path, fetchNavDoc(path));
    return navDocs.get(path);
}

/** true when an element carries authored rows rather than only naming a variant */
function hasContent(el) {
    return [...el.children]
        .some((row) => row.textContent.trim() || row.querySelector('picture, img'));
}

/** the authored rows of a content root, whether that is a nav document or a block */
function contentRows(root) {
    const container = root.classList.contains('header-unified')
        ? root
        : root.querySelector(':scope > .section > div') || root.querySelector(':scope > div') || root;
    return [...container.children].filter((child) => child.tagName !== 'SCRIPT');
}

/**
 * Resolves which variant to render and where its content comes from.
 *
 * A variant named on the page (block class or section container class) wins.
 * Otherwise the nav document decides: authoring a `header-unified` block there,
 * e.g. `header-unified (header-preferences)`, selects that variant for every
 * page. Either way the content is read from the block when authored inline, and
 * from the variant's own nav document (`/nav/header-preferences`) when not.
 *
 * @param {Element} block The block element
 * @returns {Promise<{variant: string, content: Element|null}>}
 */
async function resolveHeader(block) {
    const onPage = pageVariant(block);
    if (onPage) {
        return {
            variant: onPage,
            content: hasContent(block) ? block : await loadNavDoc(CONTENT_PATHS[onPage]),
        };
    }

    const navDoc = await loadNavDoc(navDocPath());
    const declaration = navDoc?.querySelector('.header-unified');
    if (!declaration) return { variant: 'header', content: navDoc };

    const variant = variantFromClasses(declaration) || 'header';
    if (hasContent(declaration)) return { variant, content: declaration };
    return {
        variant,
        content: CONTENT_PATHS[variant] ? await loadNavDoc(CONTENT_PATHS[variant]) : navDoc,
    };
}

/* -------------------------------------------------------------------------- */
/* Default header variant                                                     */
/* -------------------------------------------------------------------------- */

function createNavLink(link) {
    const li = document.createElement('li');
    li.className = 'global-site-header-link';
    li.append(link);
    return li;
}

function buildHeader(logoImg, links, pageTitleText, variantName = '') {
    const wrapper = document.createElement('div');
    wrapper.className = 'global-site-header';
    if (variantName) wrapper.classList.add(variantName);

    wrapper.innerHTML = `
    <div class="global-site-header-wrapper">
      <div class="global-site-header-container">
        <div class="global-site-header-logo"></div>
        <button
          class="hamburger-button"
          aria-label="Toggle navigation"
          aria-expanded="false"
          aria-controls="menu-drawer">☰</button>
        <div id="menu-drawer" class="menu-drawer" aria-hidden="true">
          <button class="close-button" aria-label="Close navigation">
            <span class="text">Close</span>
            <span class="icon">×</span>
          </button>
          <ul class="global-site-header-links mobile-nav"></ul>
        </div>
        <nav class="global-site-header-navigation" aria-label="Global Site Navigation">
          <ul class="global-site-header-links desktop-only"></ul>
        </nav>
      </div>
    </div>
    ${pageTitleText ? `<div class="page-title"><h1>${pageTitleText}</h1></div>` : ''}
  `;

    const logoLink = document.createElement('a');
    logoLink.href = '/';
    if (logoImg) logoLink.append(logoImg);
    wrapper.querySelector('.global-site-header-logo').append(logoLink);

    const desktopNav = wrapper.querySelector('.desktop-only');
    const mobileNav = wrapper.querySelector('.mobile-nav');
    links.forEach((link) => {
        desktopNav.append(createNavLink(link.cloneNode(true)));
        mobileNav.append(createNavLink(link.cloneNode(true)));
    });

    return wrapper;
}

function setupMobileMenu(header) {
    const hamburger = header.querySelector('.hamburger-button');
    const drawer = header.querySelector('.menu-drawer');
    const closeButton = header.querySelector('.close-button');

    const setOpen = (open) => {
        drawer.classList.toggle('is-open', open);
        drawer.setAttribute('aria-hidden', String(!open));
        hamburger.setAttribute('aria-expanded', String(open));
    };

    hamburger.addEventListener('click', () => setOpen(true));
    closeButton.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setOpen(false);
    });
}

// variants that pull the page's own <h1> up into the header as a title bar
const PAGE_TITLE_VARIANTS = ['header-usa', 'header-toyotamobility'];

async function decorateHeaderDefault(block, content, variantName = 'header') {
    if (!content) return;

    const logoImg = content.querySelector('picture img');

    // the title bar is authorable in the header-usa / header-toyotamobility
    // content: any heading authored there wins, otherwise fall back to the
    // page's own <h1>
    const authoredH1 = PAGE_TITLE_VARIANTS.includes(variantName)
        ? content.querySelector('h1, h2, h3, h4, h5, h6') || document.querySelector('main h1')
        : null;
    if (authoredH1) authoredH1.remove();

    const navLinks = [...content.querySelectorAll('a')]
        .filter((link) => !link.querySelector('img'));

    const pageTitleText = authoredH1 ? authoredH1.textContent.trim() : '';

    const header = buildHeader(
        logoImg?.cloneNode(true),
        navLinks,
        pageTitleText,
        variantName === 'header' ? '' : variantName,
    );

    setupMobileMenu(header);

    block.textContent = '';
    block.append(header);
}

/* -------------------------------------------------------------------------- */
/* Header privacy variant                                                     */
/* -------------------------------------------------------------------------- */

const isDesktop = window.matchMedia('(min-width: 900px)');

/** the fly-out content of an <li>, i.e. its direct child list */
function getFlyoutList(li) {
    return li.querySelector(':scope > ul');
}

/** direct-child list items of a list element */
function childItems(list) {
    return [...list.children].filter((el) => el.tagName === 'LI');
}

/** the label anchor of an <li>, ignoring anchors belonging to its sub-list */
function itemLink(li) {
    const sublist = getFlyoutList(li);
    const anchor = li.querySelector('a');
    if (anchor && (!sublist || !sublist.contains(anchor))) return anchor;
    return null;
}

/**
 * The text label of an <li>, ignoring its nested list. Document authoring often
 * wraps the label in a <p>, so read the text with any nested list removed
 * rather than relying on direct text nodes.
 */
function itemLabel(li) {
    const link = itemLink(li);
    if (link) return link.textContent.trim();
    const clone = li.cloneNode(true);
    clone.querySelectorAll('ul, ol').forEach((sub) => sub.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
}

/** builds a single anchor, preserving the authored href and legacy class names */
function buildLink(className, label, href) {
    const classNames = [className]
        .filter(Boolean)
        .flatMap((name) => name.split(/\s+/))
        .filter(Boolean);

    const legacyClass = className?.replace('header-privacy', 'header-v1');
    if (legacyClass && legacyClass !== className) classNames.push(legacyClass);

    const a = document.createElement('a');
    a.className = [...new Set(classNames)].join(' ');
    a.href = href || '#';
    a.textContent = label;
    return a;
}

/** closes every open fly-out, optionally leaving one item open */
function closeFlyouts(nav, except) {
    nav.querySelectorAll('.header-privacy-item.open').forEach((item) => {
        if (item === except) return;
        item.classList.remove('open');
        item.querySelector('.header-privacy-trigger')?.setAttribute('aria-expanded', 'false');
    });
}

// authors mark a promo column by adding [promo] to its label
function getColumnType(label) {
    return /\[promo\]/i.test(label) ? 'promo' : 'default';
}

function cleanLabel(label) {
    return label.replace(/\[promo\]/i, '').trim();
}

function buildColumn(colLi) {
    const rawLabel = itemLabel(colLi);
    const colType = getColumnType(rawLabel);
    const label = cleanLabel(rawLabel);
    const href = itemLink(colLi)?.getAttribute('href');
    const links = getFlyoutList(colLi);
    const col = document.createElement('div');
    col.className = `header-privacy-col header-v1-col ${colType === 'promo' ? 'header-privacy-col-promo header-v1-col-promo' : ''}`;

    if (!links) {
        // no children -> a single stand-alone link column
        col.append(buildLink('header-privacy-col-link', label, href));
        return col;
    }

    const heading = document.createElement('h3');
    heading.className = 'header-privacy-col-title header-v1-col-title';
    heading.append(href ? buildLink('', label, href) : document.createTextNode(label));
    col.append(heading);

    const list = document.createElement('ul');
    childItems(links).forEach((linkLi) => {
        const entry = document.createElement('li');
        entry.append(buildLink('', itemLabel(linkLi), itemLink(linkLi)?.getAttribute('href')));
        list.append(entry);
    });
    col.append(list);
    return col;
}

/** true when a nav item is the special, richly-authored "Vehicles" menu */
function isVehiclesItem(li) {
    return /^vehicles$/i.test(itemLabel(li));
}

/**
 * Builds one vehicle card. The authored <li> is expected to hold an image, a
 * model link (the name), a price line ("$… Starting MSRP"), an optional badge
 * line (e.g. "Hybrid EV"), and Build / Shop links.
 */
function buildVehicleCard(li) {
    const card = document.createElement('div');
    card.className = 'vehicle-card';

    const anchors = [...li.querySelectorAll('a')];
    const build = anchors.find((a) => /build/i.test(a.textContent));
    const shop = anchors.find((a) => /shop/i.test(a.textContent));
    // the model link is the non-CTA anchor carrying the name text; the image is
    // often wrapped in its own (text-less) anchor pointing at the same page
    const others = anchors.filter((a) => a !== build && a !== shop);
    const modelLink = others.find((a) => a.textContent.trim()) || others[0];
    const media = li.querySelector('picture') || li.querySelector('img');

    // remaining plain-text lines: prices ("$…"), a model year ("2026"), a badge
    const clone = li.cloneNode(true);
    clone.querySelectorAll('a, picture, img, ul, ol').forEach((el) => el.remove());
    const lines = clone.textContent.split('\n').map((s) => s.trim()).filter(Boolean);
    const priceLines = lines.filter((l) => l.includes('$'));
    const asShown = priceLines.find((l) => /as shown/i.test(l)) || '';
    const price = priceLines.find((l) => l !== asShown) || '';
    const year = lines.find((l) => /^\d{4}$/.test(l)) || '';
    const badge = lines.find((l) => !l.includes('$') && l !== year) || '';

    const href = modelLink?.getAttribute('href') || others[0]?.getAttribute('href') || '#';
    const img = li.querySelector('img');
    const name = (modelLink?.textContent.trim() || img?.getAttribute('alt') || '').trim();

    const image = document.createElement('a');
    image.className = 'vehicle-image';
    image.href = href;
    if (badge) {
        const b = document.createElement('span');
        b.className = 'vehicle-badge';
        b.textContent = badge;
        image.append(b);
    }
    if (media) image.append(media.cloneNode(true));
    card.append(image);

    if (asShown) {
        const shown = document.createElement('div');
        shown.className = 'as-shown';
        shown.textContent = asShown;
        card.append(shown);
    }

    if (year) {
        const yearSel = document.createElement('div');
        yearSel.className = 'year-selector';
        yearSel.innerHTML = `<div class="active">${year}</div>`;
        card.append(yearSel);
    }

    const heading = document.createElement('h3');
    heading.append(buildLink('', name, href));
    card.append(heading);

    if (price) {
        const p = document.createElement('p');
        p.textContent = price;
        card.append(p);
    }

    const actions = document.createElement('div');
    actions.className = 'vehicle-actions';
    if (build) actions.append(buildLink('', build.textContent.trim() || 'Build', build.getAttribute('href')));
    if (shop) actions.append(buildLink('', shop.textContent.trim() || 'Shop', shop.getAttribute('href')));
    if (actions.children.length) card.append(actions);

    return card;
}

function appendVehicleGrid(slide, items) {
    const grid = document.createElement('div');
    grid.className = 'vehicles-grid';
    items.forEach((v) => grid.append(buildVehicleCard(v)));
    slide.append(grid);
}

/**
 * Builds the "Vehicles" mega-menu: a left rail of category tabs that switch the
 * right-hand pane between slides of vehicle cards. A category may list vehicles
 * directly or group them under sub-category headings.
 */
function buildVehiclesItem(li) {
    const item = document.createElement('li');
    item.className = 'header-privacy-item header-v1-item has-flyout vehicles';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'header-privacy-trigger header-v1-trigger';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.innerHTML = `<span>${itemLabel(li)}</span>`;

    const flyout = document.createElement('div');
    flyout.className = 'header-privacy-flyout header-v1-flyout vehicles-flyout';

    const menu = document.createElement('div');
    menu.className = 'vehicles-menu';

    const left = document.createElement('div');
    left.className = 'vehicles-left';
    left.innerHTML = '<div class="all-models">All Models</div>';
    const catList = document.createElement('ul');
    catList.className = 'vehicles-cats';
    left.append(catList);

    const right = document.createElement('div');
    right.className = 'vehicles-right';

    const categories = childItems(getFlyoutList(li) || document.createElement('ul'));
    categories.forEach((catLi, index) => {
        const catItem = document.createElement('li');
        const catBtn = document.createElement('button');
        catBtn.type = 'button';
        catBtn.dataset.cat = String(index);
        catBtn.textContent = itemLabel(catLi);
        if (index === 0) catBtn.classList.add('active');
        catItem.append(catBtn);
        catList.append(catItem);

        const slide = document.createElement('div');
        slide.className = 'vehicles-slide';
        slide.dataset.cat = String(index);
        if (index === 0) slide.classList.add('active');

        const children = childItems(getFlyoutList(catLi) || document.createElement('ul'));
        const hasSubs = children.some((c) => getFlyoutList(c));
        if (hasSubs) {
            children.forEach((sub) => {
                const heading = document.createElement('p');
                heading.className = 'vehicles-subcat';
                heading.textContent = itemLabel(sub);
                slide.append(heading);
                appendVehicleGrid(slide, childItems(getFlyoutList(sub) || document.createElement('ul')));
            });
        } else {
            appendVehicleGrid(slide, children);
        }
        right.append(slide);
    });

    catList.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-cat]');
        if (!btn) return;
        catList.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
        right.querySelectorAll('.vehicles-slide').forEach((s) => s.classList.toggle('active', s.dataset.cat === btn.dataset.cat));
    });

    menu.append(left, right);
    flyout.append(menu);
    item.append(trigger, flyout);
    return item;
}

/**
 * Builds a primary nav item. Items with a nested list render as a fly-out
 * trigger + mega-menu panel; plain items stay as links.
 */
function buildNavItem(li) {
    const item = document.createElement('li');
    item.className = 'header-privacy-item header-v1-item';

    const label = itemLabel(li);
    const href = itemLink(li)?.getAttribute('href');
    const flyoutList = getFlyoutList(li);

    if (!flyoutList) {
        item.append(buildLink('header-privacy-link', label, href));
        return item;
    }

    item.classList.add('has-flyout');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'header-privacy-trigger header-v1-trigger';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.innerHTML = `<span>${label}</span>`;

    const flyout = document.createElement('div');
    flyout.className = 'header-privacy-flyout header-v1-flyout';

    const inner = document.createElement('div');
    inner.className = 'header-privacy-flyout-inner';
    // each second-level list item becomes a mega-menu column
    childItems(flyoutList).forEach((colLi) => inner.append(buildColumn(colLi)));
    flyout.append(inner);

    item.append(trigger, flyout);
    return item;
}

/* inline icons for the account (My Toyota) panel */
const ICON_USER = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9.2"/><circle cx="12" cy="10" r="3"/><path d="M6.4 18.6a5.7 5.7 0 0 1 11.2 0"/></svg>';
const ICON_ARROW = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h13M12 6l6 6-6 6"/></svg>';
const ICON_BELL = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
const ICON_CHEVRON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
const ICON_HEART = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9.2"/><path d="M12 16.4s-3.7-2.2-3.7-4.8a2 2 0 0 1 3.7-1.1 2 2 0 0 1 3.7 1.1c0 2.6-3.7 4.8-3.7 4.8Z"/></svg>';
const ICON_GEAR = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3.1"/><path d="M12 2.6l1.5 2.6a7.4 7.4 0 0 1 2.1.9l3-.8 1.6 2.7-2 2.3a7.4 7.4 0 0 1 0 2.3l2 2.3-1.6 2.7-3-.8a7.4 7.4 0 0 1-2.1.9L12 21.4l-1.5-2.6a7.4 7.4 0 0 1-2.1-.9l-3 .8-1.6-2.7 2-2.3a7.4 7.4 0 0 1 0-2.3l-2-2.3 1.6-2.7 3 .8a7.4 7.4 0 0 1 2.1-.9Z"/></svg>';
const ICON_DOT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/></svg>';

/** picks a row icon from the label text */
function accountRowIcon(label) {
    const key = label.toLowerCase();
    if (key.includes('notif')) return ICON_BELL;
    if (key.includes('save')) return ICON_HEART;
    if (key.includes('setting')) return ICON_GEAR;
    return ICON_DOT;
}

/** builds one account link row; rows with nested bullets become expandable notes */
function accountRowHtml(li) {
    const rawLabel = itemLabel(li);
    const href = itemLink(li)?.getAttribute('href') || '#';
    const notesList = getFlyoutList(li);
    const notes = notesList ? childItems(notesList).map((n) => itemLabel(n)) : [];

    const countMatch = rawLabel.match(/\((\d+)\)\s*$/);
    const count = countMatch ? countMatch[1] : '';
    const label = rawLabel.replace(/\s*\(\d+\)\s*$/, '');
    const icon = accountRowIcon(label);

    const meta = count
        ? `<span class="count">(${count})</span><span class="dot" aria-hidden="true"></span>`
        : '';

    if (notes.length) {
        return `
      <div class="link link-notifications has-notifications" data-count="${count}">
        <button type="button" class="link-notifications-content" aria-expanded="false">
          <span class="icon" aria-hidden="true">${icon}</span>
          <span class="label">${label}${meta}</span>
          <span class="chevron" aria-hidden="true">${ICON_CHEVRON}</span>
        </button>
        <div class="notifications">
          ${notes.map((n) => `<p class="note">${n}</p>`).join('')}
          <a class="clear-btn" href="#">Clear All</a>
        </div>
      </div>`;
    }

    return `
    <a class="link" href="${href}">
      <span class="icon" aria-hidden="true">${icon}</span>
      <span class="label">${label}${meta}</span>
    </a>`;
}

/**
 * Builds the right-aligned Account (My Toyota) control: a trigger plus a
 * logged-out panel (title, description, sign-in CTA) and the action rows.
 * Plain-text bullets carry the title / description, link bullets carry the CTA
 * (first) and the action rows (rest).
 */
function buildAccount(accountLi) {
    const triggerLabel = itemLabel(accountLi) || 'Account';

    const list = getFlyoutList(accountLi);
    const children = list ? childItems(list) : [];
    const textItems = children.filter((li) => !itemLink(li));
    const linkItems = children.filter((li) => itemLink(li));

    const title = textItems[0] ? itemLabel(textItems[0]) : 'Personalize Your Toyota Experience';
    const descriptions = textItems.slice(1).map((li) => itemLabel(li));
    if (!descriptions.length) {
        descriptions.push('Create an account or sign in to access all the tools for your Toyota in one place.');
    }

    const ctaItem = linkItems[0];
    const cta = {
        label: ctaItem ? itemLabel(ctaItem) : 'Create Account Or Sign In',
        href: ctaItem?.querySelector('a')?.getAttribute('href') || '#',
    };
    const rows = linkItems.slice(1);

    const wrap = document.createElement('div');
    wrap.className = 'header-privacy-account header-v1-account';
    wrap.innerHTML = `
    <button type="button" class="header-privacy-account-trigger header-v1-account-trigger" aria-expanded="false" aria-haspopup="true">
      <span class="header-privacy-account-icon" aria-hidden="true">${ICON_USER}</span>
      <span class="header-privacy-account-label">${triggerLabel}</span>
    </button>
    <div class="header-privacy-account-panel header-v1-account-panel my-toyota-view" data-wrapper="mytoyota">
      <div class="account-logged-out-block">
        <div class="account-title">${title}</div>
        ${descriptions.map((d) => `<p>${d}</p>`).join('')}
        <div class="ctas">
          <a class="button primary sign-in-btn" href="${cta.href}">
            <span class="link-text btn-text">${cta.label}<span class="arrow" aria-hidden="true">${ICON_ARROW}</span></span>
          </a>
        </div>
      </div>
      <div class="links">
        ${rows.map((li) => accountRowHtml(li)).join('')}
      </div>
    </div>
  `;
    return wrap;
}

/** wires the desktop mega-menu, the account panel, and the mobile drawer */
function setupInteractions(header) {
    const nav = header.querySelector('.header-privacy-nav');
    const overlay = header.querySelector('.header-privacy-overlay');
    const hamburger = header.querySelector('.header-privacy-hamburger');
    const account = header.querySelector('.header-privacy-account');
    const accountTrigger = account?.querySelector('.header-privacy-account-trigger');
    const items = [...header.querySelectorAll('.header-privacy-item.has-flyout')];

    const closeAccount = () => {
        account?.classList.remove('open');
        accountTrigger?.setAttribute('aria-expanded', 'false');
    };

    const openItem = (item) => {
        closeFlyouts(nav, item);
        closeAccount();
        item.classList.add('open');
        item.querySelector('.header-privacy-trigger')?.setAttribute('aria-expanded', 'true');
        overlay?.classList.add('active');
    };

    const closeAll = () => {
        closeFlyouts(nav);
        closeAccount();
        overlay?.classList.remove('active');
    };

    const closeMobile = () => {
        header.classList.remove('mobile-open');
        hamburger?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('header-privacy-no-scroll');
    };

    accountTrigger?.addEventListener('click', () => {
        const isOpen = account.classList.contains('open');
        closeAll();
        if (!isOpen) {
            account.classList.add('open');
            accountTrigger.setAttribute('aria-expanded', 'true');
            overlay?.classList.add('active');
        }
    });

    const notif = account?.querySelector('.link-notifications-content');
    notif?.addEventListener('click', () => {
        const row = notif.closest('.link-notifications');
        const expanded = notif.getAttribute('aria-expanded') === 'true';
        notif.setAttribute('aria-expanded', String(!expanded));
        row.classList.toggle('expanded', !expanded);
    });

    // fly-outs open/close strictly on click (no hover)
    items.forEach((item) => {
        item.querySelector('.header-privacy-trigger').addEventListener('click', () => {
            if (item.classList.contains('open')) closeAll();
            else openItem(item);
        });
    });

    hamburger?.addEventListener('click', () => {
        const expanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', String(!expanded));
        header.classList.toggle('mobile-open', !expanded);
        document.body.classList.toggle('header-privacy-no-scroll', !expanded);
        if (expanded) closeAll();
    });

    overlay?.addEventListener('click', () => {
        closeAll();
        closeMobile();
    });

    document.addEventListener('click', (event) => {
        if (!header.contains(event.target) && isDesktop.matches) closeAll();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        closeAll();
        closeMobile();
    });

    // reset drawer/fly-out state when crossing the desktop breakpoint
    isDesktop.addEventListener('change', () => {
        closeAll();
        closeMobile();
    });
}

async function decorateHeaderPrivacy(block, content) {
    if (!content) return;

    const logo = content.querySelector('picture');
    // every top-level list item across the content becomes a primary nav entry
    const sourceItems = [...content.querySelectorAll('ul')]
        .filter((ul) => !ul.closest('li'))
        .flatMap((ul) => [...ul.children].filter((li) => li.tagName === 'LI'));

    // the "Account" / "My Toyota" item is pulled out and pinned to the right
    const isAccountItem = (li) => /^(account|my\s*toyota)$/i.test(itemLabel(li));
    const accountLi = sourceItems.find(isAccountItem);
    const primaryItems = sourceItems.filter((li) => li !== accountLi);

    const header = document.createElement('header');
    header.className = 'header-privacy header-v1';
    header.innerHTML = `
    <div class="header-privacy-bar header-v1-bar">
      <a class="header-privacy-brand header-v1-brand" href="/" aria-label="Home"></a>
      <button
        class="header-privacy-hamburger header-v1-hamburger"
        type="button"
        aria-label="Toggle navigation"
        aria-expanded="false"
        aria-controls="header-privacy-nav">
        <span></span><span></span><span></span>
      </button>
      <nav id="header-privacy-nav" class="header-privacy-nav header-v1-nav" aria-label="Primary">
        <ul class="header-privacy-sections header-v1-sections"></ul>
      </nav>
    </div>
    <div class="header-privacy-overlay header-v1-overlay"></div>
  `;

    if (logo) header.querySelector('.header-privacy-brand').append(logo.cloneNode(true));

    const sections = header.querySelector('.header-privacy-sections');
    primaryItems.forEach((li) => {
        sections.append(isVehiclesItem(li) ? buildVehiclesItem(li) : buildNavItem(li));
    });

    if (accountLi) header.querySelector('.header-privacy-bar').append(buildAccount(accountLi));

    setupInteractions(header);

    block.textContent = '';
    block.append(header);
}

/* -------------------------------------------------------------------------- */
/* Header brand variant                                                       */
/* -------------------------------------------------------------------------- */

const CHEVRON_RIGHT = `
  <span class="right-chevron" aria-hidden="true">
    <svg viewBox="0 0 8 12"><path d="M1 1l5 5-5 5" /></svg>
  </span>
`;

async function decorateHeaderBrand(block, content) {
    if (!content) return;

    const rows = contentRows(content);
    if (!rows.length) return;

    const nav = document.createElement('nav');
    nav.className = 'nav-brand';
    nav.setAttribute('aria-label', 'Brand site header');

    const overlay = document.createElement('div');
    overlay.className = 'nav-mobile-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    // row 0 holds the logo
    const brandRow = rows[0];
    if (brandRow) {
        const brandWrap = document.createElement('a');
        brandWrap.className = 'nav-logo';
        brandWrap.href = '/';
        brandWrap.setAttribute('aria-label', 'Toyota home');

        const picture = brandRow.querySelector('picture');
        if (picture) brandWrap.append(picture.cloneNode(true));

        const brandText = [...brandRow.querySelectorAll('div')]
            .map((d) => d.textContent.trim())
            .find((t) => t && !picture?.closest('div')?.textContent.includes(t));

        if (brandText) {
            const span = document.createElement('span');
            span.className = 'nav-logo-text';
            span.textContent = brandText;
            brandWrap.append(span);
        }
        nav.append(brandWrap);
    }

    const sections = document.createElement('ul');
    sections.className = 'nav-sections';

    // mobile drawer shell: a root panel plus a sub panel slid in on demand
    const drawer = document.createElement('div');
    drawer.className = 'nav-drawer';

    const panels = document.createElement('div');
    panels.className = 'mobile-panels';

    const rootPanel = document.createElement('div');
    rootPanel.className = 'mobile-panel panel-root';
    const rootList = document.createElement('ul');
    rootList.className = 'mobile-menu-list';
    rootPanel.append(rootList);

    const subPanel = document.createElement('div');
    subPanel.className = 'mobile-panel panel-sub';

    const subHeader = document.createElement('div');
    subHeader.className = 'mobile-sub-header';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'mobile-back-btn';
    backBtn.innerHTML = '&#8249;';
    backBtn.addEventListener('click', () => drawer.classList.remove('sub-open'));

    const subTitle = document.createElement('span');
    subTitle.className = 'mobile-sub-title';

    subHeader.append(backBtn, subTitle);

    const subList = document.createElement('ul');
    subList.className = 'mobile-menu-list';
    subPanel.append(subHeader, subList);

    panels.append(rootPanel, subPanel);
    drawer.append(panels);

    function getLabelAndHref(element) {
        const link = element.querySelector(':scope > a, :scope > p > a, :scope > strong > a, :scope > div > a');
        if (link) return { label: link.textContent.trim(), href: link.href };

        let text = '';
        element.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'UL') {
                text += node.textContent;
            }
        });

        return { label: text.trim(), href: '#' };
    }

    function buildMegaGroup(li) {
        const group = document.createElement('div');
        group.className = 'nav-mega-group';

        const nestedList = li.querySelector(':scope > ul');
        const { label, href } = getLabelAndHref(li);

        const title = document.createElement('a');
        title.className = 'nav-mega-group-title';
        title.href = href;
        title.innerHTML = `<span>${label}</span>${CHEVRON_RIGHT}`;
        group.append(title);

        if (nestedList) {
            const list = document.createElement('ul');
            list.className = 'nav-mega-group-list';

            [...nestedList.children].forEach((item) => {
                const { label: itemText, href: itemHref } = getLabelAndHref(item);
                const liItem = document.createElement('li');
                const aItem = document.createElement('a');
                aItem.href = itemHref;
                aItem.textContent = itemText;
                liItem.append(aItem);
                list.append(liItem);
            });

            group.append(list);
        }

        return group;
    }

    function buildMegaMenu(sourceList) {
        const mega = document.createElement('div');
        mega.className = 'nav-mega';

        const inner = document.createElement('div');
        inner.className = 'nav-mega-inner';

        [...sourceList.children].forEach((topLi) => {
            const col = document.createElement('div');
            col.className = 'nav-mega-col';

            const hasSubCategories = topLi.querySelector(':scope > ul');
            const { label } = getLabelAndHref(topLi);

            // an unlabelled item is a column wrapper, not a group of its own
            if (hasSubCategories && !label) {
                [...hasSubCategories.children].forEach((subLi) => col.append(buildMegaGroup(subLi)));
            } else {
                col.append(buildMegaGroup(topLi));
            }

            inner.append(col);
        });

        mega.append(inner);
        return mega;
    }

    let hamburger;

    function clearAllActiveStates() {
        nav.querySelectorAll('.nav-dropdown-trigger[aria-expanded="true"]').forEach((btn) => {
            btn.setAttribute('aria-expanded', 'false');
        });
        nav.querySelectorAll('.nav-link.active').forEach((link) => link.classList.remove('active'));
        block.classList.remove('nav-open');
        drawer.classList.remove('sub-open');
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
        overlay.classList.remove('is-active');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('nav-menu-open');
    }

    function triggerBlink(element) {
        element.classList.remove('blink-effect');
        void element.offsetWidth; // force a reflow so the animation restarts
        element.classList.add('blink-effect');
        element.addEventListener('animationend', () => {
            element.classList.remove('blink-effect');
        }, { once: true });
    }

    function buildSearch() {
        const wrapper = document.createElement('div');
        wrapper.className = 'nav-search';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nav-search-toggle';
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Search');
        btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/>
        <line x1="15.5" y1="15.5" x2="21" y2="21" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/>
      </svg>
      <span class="search-text">Search</span>
    `;

        wrapper.append(btn);
        return wrapper;
    }

    // remaining rows are nav entries: first cell is the label, second the sub-menu
    for (let i = 1; i < rows.length; i += 1) {
        const cells = [...rows[i].children];
        const firstCellText = cells[0]?.textContent.trim() ?? '';
        const label = firstCellText.toLowerCase();
        // blank rows are decorative; search and log in are rendered as actions
        if (firstCellText && label !== 'search' && label !== 'log in') {
            const nestedList = cells[1]?.querySelector('ul');
            const firstLink = cells[0].querySelector('a');

            const li = document.createElement('li');
            li.className = 'nav-section';

            if (nestedList) {
                const trigger = document.createElement('button');
                trigger.type = 'button';
                trigger.className = 'nav-dropdown-trigger';
                trigger.setAttribute('aria-expanded', 'false');
                trigger.innerHTML = `
        ${firstCellText}
        <span class="nav-caret" aria-hidden="true">
          <svg viewBox="0 0 12 8"><path d="M1 1l5 5 5-5" /></svg>
        </span>
      `;

                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    triggerBlink(trigger);

                    const expanded = trigger.getAttribute('aria-expanded') === 'true';
                    clearAllActiveStates();

                    if (!expanded) {
                        trigger.setAttribute('aria-expanded', 'true');
                        overlay.classList.add('is-active');
                        overlay.setAttribute('aria-hidden', 'false');
                    }
                });

                li.append(trigger, buildMegaMenu(nestedList));
            } else {
                const a = document.createElement('a');
                a.className = 'nav-link';
                a.href = firstLink ? firstLink.href : '#';
                a.textContent = firstCellText;

                a.addEventListener('click', () => {
                    triggerBlink(a);
                    clearAllActiveStates();
                    a.classList.add('active');
                });

                li.append(a);
            }
            sections.append(li);

            // mirror the entry into the mobile drawer
            const mLi = document.createElement('li');
            if (nestedList) {
                const mBtn = document.createElement('button');
                mBtn.type = 'button';
                mBtn.innerHTML = `<span>${firstCellText}</span><span class="mobile-chevron">&#8250;</span>`;

                mBtn.addEventListener('click', () => {
                    subTitle.textContent = firstCellText;
                    subList.innerHTML = '';

                    [...nestedList.children].forEach((topLi) => {
                        const { label: subLabel, href: subHref } = getLabelAndHref(topLi);
                        const sLi = document.createElement('li');
                        const sA = document.createElement('a');
                        sA.href = subHref;
                        sA.textContent = subLabel;
                        sLi.append(sA);
                        subList.append(sLi);
                    });

                    drawer.classList.add('sub-open');
                });

                mLi.append(mBtn);
            } else {
                const mA = document.createElement('a');
                mA.href = firstLink ? firstLink.href : '#';
                mA.textContent = firstCellText;
                mLi.append(mA);
            }
            rootList.append(mLi);
        }
    }

    const loginRow = rows.find((r) => r.children[0]?.textContent.trim().toLowerCase() === 'log in');
    const loginHref = loginRow?.querySelector('a')?.href || '#';

    const mLoginLi = document.createElement('li');
    const mLoginA = document.createElement('a');
    mLoginA.href = loginHref;
    mLoginA.textContent = 'Log In';
    mLoginLi.append(mLoginA);
    rootList.append(mLoginLi);

    nav.append(sections);

    const actions = document.createElement('div');
    actions.className = 'nav-actions';
    actions.append(buildSearch());

    const loginBtn = document.createElement('a');
    loginBtn.className = 'nav-login';
    loginBtn.href = loginHref;
    loginBtn.textContent = 'Log In';
    actions.append(loginBtn);

    hamburger = document.createElement('button');
    hamburger.type = 'button';
    hamburger.className = 'nav-hamburger';
    hamburger.setAttribute('aria-label', 'Toggle Navigation');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.innerHTML = `
    <div class="icon-menu">
      <svg viewBox="0 0 24 24" width="28" height="24">
        <path d="M2 5h20M2 12h20M2 19h20" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/>
      </svg>
    </div>
    <div class="icon-close">&#10005;</div>
  `;

    // the drawer hangs off the bottom of the header, which can move on scroll
    const updateMobileDrawerPosition = () => {
        const headerWrapper = block.closest('header') || block.closest('.header-brand-wrapper') || block;
        const { bottom } = headerWrapper.getBoundingClientRect();
        drawer.style.setProperty('--mobile-nav-top', `${Math.max(bottom, 0)}px`);
    };

    hamburger.addEventListener('click', () => {
        const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';

        updateMobileDrawerPosition();
        clearAllActiveStates();

        const willBeOpen = !isExpanded;
        hamburger.setAttribute('aria-expanded', String(willBeOpen));
        block.classList.toggle('nav-open', willBeOpen);
        document.body.classList.toggle('nav-menu-open', willBeOpen);
        overlay.classList.toggle('is-active', willBeOpen);
        overlay.setAttribute('aria-hidden', String(!willBeOpen));
    });

    overlay.addEventListener('click', clearAllActiveStates);

    window.addEventListener('resize', () => {
        if (block.classList.contains('nav-open')) updateMobileDrawerPosition();
    });

    actions.append(hamburger);
    nav.append(actions, drawer, overlay);

    document.addEventListener('click', (e) => {
        if (!block.contains(e.target)) clearAllActiveStates();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') clearAllActiveStates();
    });

    block.textContent = '';
    block.append(nav);
}

/* -------------------------------------------------------------------------- */
/* Header firm variant                                                        */
/* -------------------------------------------------------------------------- */

async function decorateHeaderFirm(block, content) {
    if (!content) return;

    const rows = contentRows(content);
    if (rows.length < 2) return;

    const [logoRow, titleRow] = rows;
    const logoLink = logoRow.querySelector('a');
    const titleLink = titleRow.querySelector('a');
    const picture = logoRow.querySelector('picture') || logoRow.querySelector('img');

    const link = document.createElement('a');
    link.href = logoLink?.href || titleLink?.href || '#';
    link.className = 'header-firm-link';

    if (picture) link.append(picture.cloneNode(true));

    const titleEl = document.createElement('span');
    titleEl.className = 'header-firm-title';
    titleEl.textContent = titleLink
        ? titleLink.textContent.trim()
        : titleRow.textContent.trim();

    link.append(titleEl);

    block.replaceChildren(link);
}

/* -------------------------------------------------------------------------- */
/* Header preferences variant                                                 */
/* -------------------------------------------------------------------------- */

const DEFAULT_HREFS = {
    'toyota-logo': 'https://www.toyota.com',
    'lexus-logo': 'https://www.lexus.com',
};

function detectBrandClass(src = '', alt = '', fallbackIndex = 0) {
    const haystack = `${src} ${alt}`.toLowerCase();
    if (haystack.includes('lexus')) return 'lexus-logo';
    if (haystack.includes('toyota')) return 'toyota-logo';
    return fallbackIndex === 0 ? 'toyota-logo' : 'lexus-logo';
}

async function decorateHeaderPreferences(block, content) {
    if (!content) return;

    const rows = contentRows(content);
    if (!rows.length) return;

    // rows carrying images are logos, text-only rows override the title
    const imageEls = [];
    let titleText = 'My Toyota & Lexus Communications Profile';

    rows.forEach((row) => {
        const rowImages = [...row.querySelectorAll('picture, img')]
            .filter((el) => el.tagName !== 'IMG' || !el.closest('picture'));

        if (!rowImages.length) {
            const text = [...row.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6')]
                .map((el) => el.textContent.trim())
                .filter(Boolean)
                .join(' ')
                .trim();

            if (text) titleText = text;
            return;
        }

        rowImages.forEach((el) => imageEls.push(el));
    });

    block.textContent = '';

    const headerWrap = document.createElement('div');
    headerWrap.className = 'header-wrap row';

    const col = document.createElement('div');
    col.className = 'col';

    const logoWrap = document.createElement('div');
    logoWrap.className = 'logo-wrap';
    logoWrap.setAttribute('role', 'img');
    logoWrap.setAttribute('aria-label', 'Brand logos');

    imageEls.forEach((el, index) => {
        const picture = el.tagName === 'PICTURE' ? el : null;
        const img = picture ? picture.querySelector('img') : el;
        if (!img) return;

        const brandClass = detectBrandClass(
            img.getAttribute('src') || '',
            img.getAttribute('alt') || '',
            index,
        );

        const link = document.createElement('a');
        link.href = el.closest('a')?.getAttribute('href') || DEFAULT_HREFS[brandClass] || '#';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = brandClass;
        link.append((picture || img).cloneNode(true));

        logoWrap.append(link);
    });

    col.append(logoWrap);
    headerWrap.append(col);

    const headerCnt = document.createElement('div');
    headerCnt.className = 'header-cnt col';

    const titleEl = document.createElement('p');
    titleEl.className = 'header-title';
    titleEl.textContent = titleText;

    headerCnt.append(titleEl);
    headerWrap.append(headerCnt);

    block.append(headerWrap);
}

const DECORATORS = {
    header: decorateHeaderDefault,
    'header-privacy': decorateHeaderPrivacy,
    'header-brand': decorateHeaderBrand,
    'header-firm': decorateHeaderFirm,
    'header-preferences': decorateHeaderPreferences,
    'header-usa': (block, content) => decorateHeaderDefault(block, content, 'header-usa'),
    'header-toyotamobility': (block, content) => decorateHeaderDefault(block, content, 'header-toyotamobility'),
};

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
    const { variant, content } = await resolveHeader(block);

    // expose the resolved variant so the variant CSS applies when it came from
    // the nav document rather than from a class on the block
    if (variant !== 'header') block.classList.add(variant);

    await (DECORATORS[variant] || decorateHeaderDefault)(block, content);
}
