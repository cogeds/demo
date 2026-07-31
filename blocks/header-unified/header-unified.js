import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Returns the requested header variant.
 * Supports both block-level classes and section container classes.
 */
function getHeaderVariant(block) {
    if (block.classList.contains('header-v1') || block.closest('.header-v1-container')) {
        return 'header-v1';
    }

    if (block.classList.contains('header-brand') || block.closest('.header-brand-container')) {
        return 'header-brand';
    }

    if (block.classList.contains('header-v3') || block.closest('.header-v3-container')) {
        return 'header-v3';
    }

    if (block.classList.contains('header-firm') || block.closest('.header-firm-container')) {
        return 'header-firm';
    }

    return 'header';
}


/* --------------------------------------------------------------------------
 * Default header variant
 * -------------------------------------------------------------------------- */

function createNavLink(link) {
    const li = document.createElement('li');
    li.className = 'global-site-header-link';

    li.append(link);

    return li;
}

function buildHeader(logoImg, links, pageTitleText) {
    const wrapper = document.createElement('div');
    wrapper.className = 'global-site-header';

    wrapper.innerHTML = `
  <div class="global-site-header-wrapper">
    <div class="global-site-header-container">

      <div class="global-site-header-logo"></div>

      <button
        class="hamburger-button"
        aria-label="Toggle navigation"
        aria-expanded="false"
        aria-controls="menu-drawer">
        ☰
      </button>

      <div
        id="menu-drawer"
        class="menu-drawer"
        aria-hidden="true">

        <button
          class="close-button"
          aria-label="Close navigation">

          <span class="text">Close</span>
          <span class="icon">×</span>

        </button>

        <ul class="global-site-header-links mobile-nav"></ul>

      </div>

      <nav
        class="global-site-header-navigation"
        aria-label="Global Site Navigation">

        <ul
          class="global-site-header-links desktop-only">
        </ul>

      </nav>

    </div>
  </div>

  ${pageTitleText
            ? `
      <div class="page-title">
        <h1>${pageTitleText}</h1>
      </div>
    `
            : ''
        }
`;

    const logoContainer =
        wrapper.querySelector('.global-site-header-logo');

    const logoLink = document.createElement('a');

    logoLink.href = '/';

    if (logoImg) {
        logoLink.append(logoImg);
    }

    logoContainer.append(logoLink);

    const desktopNav =
        wrapper.querySelector('.desktop-only');

    const mobileNav =
        wrapper.querySelector('.mobile-nav');

    links.forEach((link) => {
        desktopNav.append(
            createNavLink(link.cloneNode(true)),
        );

        mobileNav.append(
            createNavLink(link.cloneNode(true)),
        );
    });

    return wrapper;
}

function setupMobileMenu(header) {
    const hamburger =
        header.querySelector('.hamburger-button');

    const drawer =
        header.querySelector('.menu-drawer');

    const closeButton =
        header.querySelector('.close-button');

    const openMenu = () => {
        drawer.classList.add('is-open');

        drawer.setAttribute(
            'aria-hidden',
            'false',
        );

        hamburger.setAttribute(
            'aria-expanded',
            'true',
        );
    };

    const closeMenu = () => {
        drawer.classList.remove('is-open');

        drawer.setAttribute(
            'aria-hidden',
            'true',
        );

        hamburger.setAttribute(
            'aria-expanded',
            'false',
        );
    };

    hamburger.addEventListener(
        'click',
        openMenu,
    );

    closeButton.addEventListener(
        'click',
        closeMenu,
    );

    document.addEventListener(
        'keydown',
        (e) => {
            if (e.key === 'Escape') {
                closeMenu();
            }
        },
    );
}

async function decorateHeaderDefault(block) {
    const navMeta = getMetadata('nav');

    const navPath = navMeta
        ? new URL(navMeta, window.location).pathname
        : '/nav';

    const fragment =
        await loadFragment(navPath);

    if (!fragment) return;

    const logoImg =
        fragment.querySelector('picture img');

    const navLinks = [
        ...fragment.querySelectorAll('a'),
    ].filter((link) => !link.querySelector('img'));

    const authoredH1 = document.querySelector('main h1');

    const pageTitleText = authoredH1
        ? authoredH1.textContent.trim()
        : '';

    const header = buildHeader(
        logoImg?.cloneNode(true),
        navLinks,
        pageTitleText,
    );

    if (authoredH1) {
        authoredH1.remove();
    }

    setupMobileMenu(header);

    block.textContent = '';

    block.append(header);
}


/* --------------------------------------------------------------------------
 * Header v1 variant
 * -------------------------------------------------------------------------- */

// media query used to switch between the desktop mega-menu and the mobile drawer
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Returns the direct child list of an <li>, if it has one (its fly-out content).
 * @param {Element} li
 * @returns {Element|null}
 */
function getFlyoutList(li) {
    return li.querySelector(':scope > ul');
}

/** direct-child list items of a list element */
function childItems(list) {
    return [...list.children].filter((el) => el.tagName === 'LI');
}

/**
 * The label anchor of an <li> (the link the author put on the label itself),
 * ignoring any anchors that belong to the nested sub-list.
 */
function itemLink(li) {
    const sublist = getFlyoutList(li);
    const anchor = li.querySelector('a');
    if (anchor && (!sublist || !sublist.contains(anchor))) return anchor;
    return null;
}

/**
 * The text label of an <li>, ignoring its nested list. Document authoring often
 * wraps the label in a <p> (e.g. `<li><p>Vehicles</p><ul>…</ul></li>`), so read
 * the item's text with any nested list removed rather than direct text nodes.
 */
function itemLabel(li) {
    const link = itemLink(li);
    if (link) return link.textContent.trim();
    const clone = li.cloneNode(true);
    clone.querySelectorAll('ul, ol').forEach((sub) => sub.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
}

/** builds a single anchor, preserving the authored href */
function buildLink(className, label, href) {
    const a = document.createElement('a');
    a.className = className;
    a.href = href || '#';
    a.textContent = label;
    return a;
}

/**
 * Closes every open fly-out in the header and resets the trigger state.
 * @param {Element} nav
 * @param {Element} [except] optional item to leave open
 */
function closeFlyouts(nav, except) {
    nav.querySelectorAll('.header-v1-item.open').forEach((item) => {
        if (item === except) return;
        item.classList.remove('open');
        item.querySelector('.header-v1-trigger')?.setAttribute('aria-expanded', 'false');
    });
}

/**
 * Builds a single primary navigation item. Items that carry a nested list are
 * rendered as a fly-out trigger + mega-menu panel; plain items stay as links.
 * @param {Element} li the source <li> from the nav fragment
 * @returns {Element}
 */
function getColumnType(label) {
    if (/\[promo\]/i.test(label)) return 'promo';
    return 'default';
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
    col.className = `header-v1-col ${colType === 'promo' ? 'header-v1-col-promo' : ''}`;

    if (!links) {
        // second-level item with no children -> a single stand-alone link column
        col.append(buildLink('header-v1-col-link', label, href));
        return col;
    }

    // second-level item WITH children -> a titled column of links
    const heading = document.createElement('h3');
    heading.className = 'header-v1-col-title';
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
 * Builds one vehicle card from an authored <li>. The item is expected to hold
 * an image, a model link (the name), a price line ("$… Starting MSRP"), an
 * optional badge line (e.g. "Hybrid EV"), and Build / Shop links.
 * @param {Element} li
 * @returns {Element}
 */
function buildVehicleCard(li) {
    const card = document.createElement('div');
    card.className = 'vehicle-card';

    const anchors = [...li.querySelectorAll('a')];
    const build = anchors.find((a) => /build/i.test(a.textContent));
    const shop = anchors.find((a) => /shop/i.test(a.textContent));
    // the model link is the non-CTA anchor that carries the name text; the image
    // is often wrapped in its own (text-less) anchor pointing at the same page.
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

/** appends a grid of vehicle cards for the given source list items */
function appendVehicleGrid(slide, items) {
    const grid = document.createElement('div');
    grid.className = 'vehicles-grid';
    items.forEach((v) => grid.append(buildVehicleCard(v)));
    slide.append(grid);
}

/**
 * Builds the "Vehicles" mega-menu: a left rail of category tabs that switch the
 * right-hand pane between slides of vehicle cards. A category may either list
 * vehicles directly or group them under sub-category headings (e.g. Electrified
 * -> Battery / Plug-in Hybrid / Hybrid / Fuel Cell).
 * @param {Element} li source "Vehicles" nav item
 * @returns {Element}
 */
function buildVehiclesItem(li) {
    const item = document.createElement('li');
    item.className = 'header-v1-item has-flyout vehicles';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'header-v1-trigger';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.innerHTML = `<span>${itemLabel(li)}</span>`;

    const flyout = document.createElement('div');
    flyout.className = 'header-v1-flyout vehicles-flyout';

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

function buildNavItem(li) {
    const item = document.createElement('li');
    item.className = 'header-v1-item';

    const label = itemLabel(li);
    const href = itemLink(li)?.getAttribute('href');
    const flyoutList = getFlyoutList(li);

    if (!flyoutList) {
        // top-level item with no children -> a plain primary link, no mega-menu
        item.append(buildLink('header-v1-link', label, href));
        return item;
    }

    item.classList.add('has-flyout');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'header-v1-trigger';
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.innerHTML = `<span>${label}</span>`;

    const flyout = document.createElement('div');
    flyout.className = 'header-v1-flyout';

    const inner = document.createElement('div');
    inner.className = 'header-v1-flyout-inner';
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
 * logged-out panel (title, description, sign-in CTA) and Notifications /
 * My Saves / Settings rows. Hrefs are taken from the authored account item's
 * links where they match, otherwise sensible defaults are used.
 * @param {Element} [accountLi] the source "Account" nav item, if authored
 * @returns {Element}
 */
function buildAccount(accountLi) {
    const triggerLabel = itemLabel(accountLi) || 'Account';

    // split the authored Account children: plain-text bullets carry the title /
    // description, link bullets carry the CTA (first) and the action rows (rest).
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
    wrap.className = 'header-v1-account';
    wrap.innerHTML = `
    <button type="button" class="header-v1-account-trigger" aria-expanded="false" aria-haspopup="true">
      <span class="header-v1-account-icon" aria-hidden="true">${ICON_USER}</span>
      <span class="header-v1-account-label">${triggerLabel}</span>
    </button>
    <div class="header-v1-account-panel my-toyota-view" data-wrapper="mytoyota">
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

/**
 * Wires the desktop mega-menu, the right-aligned account panel, and the
 * mobile drawer behaviour.
 * @param {Element} header
 */
function setupInteractions(header) {
    const nav = header.querySelector('.header-v1-nav');
    const overlay = header.querySelector('.header-v1-overlay');
    const hamburger = header.querySelector('.header-v1-hamburger');
    const account = header.querySelector('.header-v1-account');
    const accountTrigger = account?.querySelector('.header-v1-account-trigger');
    const items = [...header.querySelectorAll('.header-v1-item.has-flyout')];

    const closeAccount = () => {
        account?.classList.remove('open');
        accountTrigger?.setAttribute('aria-expanded', 'false');
    };

    const openItem = (item) => {
        closeFlyouts(nav, item);
        closeAccount();
        item.classList.add('open');
        item.querySelector('.header-v1-trigger')?.setAttribute('aria-expanded', 'true');
        overlay?.classList.add('active');
    };

    const closeAll = () => {
        closeFlyouts(nav);
        closeAccount();
        overlay?.classList.remove('active');
    };

    // account panel (right side) — click to toggle
    accountTrigger?.addEventListener('click', () => {
        const isOpen = account.classList.contains('open');
        closeAll();
        if (!isOpen) {
            account.classList.add('open');
            accountTrigger.setAttribute('aria-expanded', 'true');
            overlay?.classList.add('active');
        }
    });

    // notifications expand/collapse inside the account panel
    const notif = account?.querySelector('.link-notifications-content');
    notif?.addEventListener('click', () => {
        const row = notif.closest('.link-notifications');
        const expanded = notif.getAttribute('aria-expanded') === 'true';
        notif.setAttribute('aria-expanded', String(!expanded));
        row.classList.toggle('expanded', !expanded);
    });

    items.forEach((item) => {
        const trigger = item.querySelector('.header-v1-trigger');

        // open/close strictly on click (no hover)
        trigger.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            if (isOpen) {
                closeAll();
            } else {
                openItem(item);
            }
        });
    });

    // hamburger toggles the mobile drawer
    hamburger?.addEventListener('click', () => {
        const expanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', String(!expanded));
        header.classList.toggle('mobile-open', !expanded);
        document.body.classList.toggle('header-v1-no-scroll', !expanded);
        if (expanded) closeAll();
    });

    overlay?.addEventListener('click', () => {
        closeAll();
        header.classList.remove('mobile-open');
        hamburger?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('header-v1-no-scroll');
    });

    // click outside closes any open desktop fly-out
    document.addEventListener('click', (event) => {
        if (!header.contains(event.target) && isDesktop.matches) closeAll();
    });

    // escape closes everything
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        closeAll();
        header.classList.remove('mobile-open');
        hamburger?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('header-v1-no-scroll');
    });

    // reset drawer/fly-out state when crossing the desktop breakpoint
    isDesktop.addEventListener('change', () => {
        closeAll();
        header.classList.remove('mobile-open');
        hamburger?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('header-v1-no-scroll');
    });
}

/**
 * loads and decorates the header-v1 block
 * @param {Element} block The block element
 */
async function decorateHeaderV1(block) {
    const navMeta = getMetadata('nav');
    const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav/nav';

    const fragment = await loadFragment(navPath);
    if (!fragment) return;

    const logo = fragment.querySelector('picture');
    // every top-level list item across the fragment becomes a primary nav entry
    const sourceItems = [...fragment.querySelectorAll('ul')]
        .filter((ul) => !ul.closest('li')) // only top-level lists, not nested ones
        .flatMap((ul) => [...ul.children].filter((li) => li.tagName === 'LI'));

    // the "Account" / "My Toyota" item is pulled out and pinned to the right
    const isAccountItem = (li) => /^(account|my\s*toyota)$/i.test(itemLabel(li));
    const accountLi = sourceItems.find(isAccountItem);
    const primaryItems = sourceItems.filter((li) => li !== accountLi);

    const header = document.createElement('header');
    header.className = 'header-v1';
    header.innerHTML = `
    <div class="header-v1-bar">
      <a class="header-v1-brand" href="/" aria-label="Home"></a>
      <button
        class="header-v1-hamburger"
        type="button"
        aria-label="Toggle navigation"
        aria-expanded="false"
        aria-controls="header-v1-nav">
        <span></span><span></span><span></span>
      </button>
      <nav id="header-v1-nav" class="header-v1-nav" aria-label="Primary">
        <ul class="header-v1-sections"></ul>
      </nav>
    </div>
    <div class="header-v1-overlay" hidden></div>
  `;

    if (logo) header.querySelector('.header-v1-brand').append(logo.cloneNode(true));
    header.querySelector('.header-v1-overlay').removeAttribute('hidden');

    const sections = header.querySelector('.header-v1-sections');
    primaryItems.forEach((li) => {
        sections.append(isVehiclesItem(li) ? buildVehiclesItem(li) : buildNavItem(li));
    });

    if (accountLi) header.querySelector('.header-v1-bar').append(buildAccount(accountLi));

    setupInteractions(header);

    block.textContent = '';
    block.append(header);
}


/* --------------------------------------------------------------------------
 * Header brand variant
 * -------------------------------------------------------------------------- */

function decorateHeaderBrand(block) {
    const rows = [...block.children];
    const nav = document.createElement('nav');
    nav.className = 'nav-brand';
    nav.setAttribute('aria-label', 'Brand site header');

    const overlay = document.createElement('div');
    overlay.className = 'nav-mobile-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    // --- Row 0: Logo ---
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

    // --- Desktop Navigation Bar ---
    const sections = document.createElement('ul');
    sections.className = 'nav-sections';

    // --- Mobile Drawer Shell ---
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

    const subTitle = document.createElement('span');
    subTitle.className = 'mobile-sub-title';

    subHeader.append(backBtn, subTitle);

    const subList = document.createElement('ul');
    subList.className = 'mobile-menu-list';
    subPanel.append(subHeader, subList);

    backBtn.addEventListener('click', () => {
        drawer.classList.remove('sub-open');
    });

    panels.append(rootPanel, subPanel);
    drawer.append(panels);

    function isDecorativeRow(cellText) {
        return cellText === '';
    }

    function getLabelAndHref(element) {
        const link = element.querySelector(':scope > a, :scope > p > a, :scope > strong > a, :scope > div > a');
        if (link) {
            return { label: link.textContent.trim(), href: link.href };
        }

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

    function getRightChevronSVG() {
        return `
      <span class="right-chevron" aria-hidden="true">
        <svg viewBox="0 0 8 12">
          <path d="M1 1l5 5-5 5" />
        </svg>
      </span>
    `;
    }

    function buildMegaGroup(li) {
        const group = document.createElement('div');
        group.className = 'nav-mega-group';

        const nestedList = li.querySelector(':scope > ul');
        const { label, href } = getLabelAndHref(li);

        const title = document.createElement('a');
        title.className = 'nav-mega-group-title';
        title.href = href;
        title.innerHTML = `<span>${label}</span>${getRightChevronSVG()}`;
        group.append(title);

        if (nestedList) {
            const list = document.createElement('ul');
            list.className = 'nav-mega-group-list';

            [...nestedList.children].forEach((item) => {
                const { label: itemLabel, href: itemHref } = getLabelAndHref(item);
                const liItem = document.createElement('li');
                const aItem = document.createElement('a');
                aItem.href = itemHref;
                aItem.textContent = itemLabel;
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

            if (hasSubCategories && !label) {
                [...hasSubCategories.children].forEach((subLi) => {
                    col.append(buildMegaGroup(subLi));
                });
            } else {
                col.append(buildMegaGroup(topLi));
            }

            inner.append(col);
        });

        mega.append(inner);
        return mega;
    }

    function clearAllActiveStates() {
        nav.querySelectorAll('.nav-dropdown-trigger[aria-expanded="true"]').forEach((btn) => {
            btn.setAttribute('aria-expanded', 'false');
        });
        nav.querySelectorAll('.nav-link.active').forEach((link) => {
            link.classList.remove('active');
        });
        block.classList.remove('nav-open');
        drawer.classList.remove('sub-open');
        if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
        if (overlay) {
            overlay.classList.remove('is-active');
            overlay.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('nav-menu-open');
    }

    function triggerBlink(element) {
        element.classList.remove('blink-effect');
        void element.offsetWidth;
        element.classList.add('blink-effect');

        element.addEventListener(
            'animationend',
            () => {
                element.classList.remove('blink-effect');
            },
            { once: true }
        );
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

    // Parse items from table
    for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i];
        const cells = [...row.children];
        const firstCellText = cells[0]?.textContent.trim() ?? '';
        if (isDecorativeRow(firstCellText)) continue;

        const label = firstCellText.toLowerCase();
        if (label === 'search' || label === 'log in') continue;

        const nestedList = cells[1]?.querySelector('ul');
        const firstLink = cells[0].querySelector('a');

        // Desktop
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
          <svg viewBox="0 0 12 8">
            <path d="M1 1l5 5 5-5" />
          </svg>
        </span>
      `;

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                triggerBlink(trigger);

                const expanded = trigger.getAttribute('aria-expanded') === 'true';
                clearAllActiveStates();

                if (!expanded) {
                    trigger.setAttribute('aria-expanded', 'true');
                    if (overlay) {
                        overlay.classList.add('is-active');
                        overlay.setAttribute('aria-hidden', 'false');
                    }
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

        // Mobile
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

    // Log In mobile link
    const loginRow = rows.find((r) => r.children[0]?.textContent.trim().toLowerCase() === 'log in');
    const loginLink = loginRow?.querySelector('a');

    const mLoginLi = document.createElement('li');
    const mLoginA = document.createElement('a');
    mLoginA.href = loginLink ? loginLink.href : '#';
    mLoginA.textContent = 'Log In';
    mLoginLi.append(mLoginA);
    rootList.append(mLoginLi);

    nav.append(sections);

    // Right Side Actions
    const actions = document.createElement('div');
    actions.className = 'nav-actions';
    actions.append(buildSearch());

    const loginBtn = document.createElement('a');
    loginBtn.className = 'nav-login';
    loginBtn.href = loginLink ? loginLink.href : '#';
    loginBtn.textContent = 'Log In';
    actions.append(loginBtn);

    const hamburger = document.createElement('button');
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

    const updateMobileDrawerPosition = () => {
        const headerWrapper = block.closest('header') || block.closest('.header-brand-wrapper') || block;
        const rect = headerWrapper.getBoundingClientRect();
        const topOffset = Math.max(rect.bottom, 0);

        drawer.style.setProperty('--mobile-nav-top', `${topOffset}px`);
    };

    const toggleMobileMenu = () => {
        const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';

        updateMobileDrawerPosition();
        clearAllActiveStates();

        const willBeOpen = !isExpanded;
        hamburger.setAttribute('aria-expanded', String(willBeOpen));

        block.classList.toggle('nav-open', willBeOpen);
        document.body.classList.toggle('nav-menu-open', willBeOpen);

        if (overlay) {
            overlay.classList.toggle('is-active', willBeOpen);
            overlay.setAttribute('aria-hidden', String(!willBeOpen));
        }
    };

    hamburger.addEventListener('click', toggleMobileMenu);

    overlay.addEventListener('click', () => {
        clearAllActiveStates();
    });

    window.addEventListener('resize', () => {
        if (block.classList.contains('nav-open')) {
            updateMobileDrawerPosition();
        }
    });

    actions.append(hamburger);
    nav.append(actions);
    nav.append(drawer);
    nav.append(overlay);

    document.addEventListener('click', (e) => {
        if (!block.contains(e.target)) {
            clearAllActiveStates();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            clearAllActiveStates();
        }
    });

    block.textContent = '';
    block.append(nav);
}


/* --------------------------------------------------------------------------
 * Header v3 variant
 * -------------------------------------------------------------------------- */

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

function decorateHeaderV3(block) {
    const rows = [...block.children];
    let titleText = 'My Toyota & Lexus Communications Profile';
    const imageEls = [];
    rows.forEach((row) => {
        const cells = [...row.children];
        const rowImages = [...row.querySelectorAll('picture, img')].filter((el) => {
            if (el.tagName === 'IMG') return !el.closest('picture');
            return true;
        });

        if (rowImages.length === 0) {
            const text = cells.map((c) => c.textContent.trim()).join(' ').trim();
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
    logoWrap.setAttribute('aria-label', 'Brand Logo');

    imageEls.forEach((el, index) => {
        const picture = el.tagName === 'PICTURE' ? el : null;
        const img = picture ? picture.querySelector('img') : el;
        if (!img) return;
        const src = img.getAttribute('src') || '';
        const alt = img.getAttribute('alt') || '';
        const brandClass = detectBrandClass(src, alt, index);
        const existingLink = el.closest('a');
        const href = existingLink?.getAttribute('href') || DEFAULT_HREFS[brandClass];
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = brandClass;
        a.append(picture || img);
        logoWrap.append(a);
    });

    col.append(logoWrap);
    headerWrap.append(col);
    const headerCnt = document.createElement('div');
    headerCnt.className = 'header-cnt col';
    const title = document.createElement('p');
    title.className = 'header-title';
    title.textContent = titleText;
    headerCnt.append(title);
    headerWrap.append(headerCnt);
    block.append(headerWrap);
}


/* --------------------------------------------------------------------------
 * Header firm variant
 * -------------------------------------------------------------------------- */

function decorateHeaderFirm(block) {
    const rows = [...block.children];

    if (rows.length < 2) return;

    const logoRow = rows[0];
    const titleRow = rows[1];

    const logoLink = logoRow.querySelector('a');
    const titleLink = titleRow.querySelector('a');

    const picture = logoRow.querySelector('picture');

    // Use authored URL
    const href = logoLink?.href || titleLink?.href || '#';

    const link = document.createElement('a');
    link.href = href;
    link.className = 'header-firm-link';

    if (picture) {
        link.append(picture);
    }

    const titleEl = document.createElement('span');
    titleEl.className = 'header-firm-title';
    titleEl.textContent = titleLink
        ? titleLink.textContent.trim()
        : titleRow.textContent.trim();

    link.append(titleEl);

    block.replaceChildren(link);
}


export default async function decorate(block) {
    const variant = getHeaderVariant(block);

    if (variant === 'header-v1') {
        await decorateHeaderV1(block);
        return;
    }

    if (variant === 'header-brand') {
        decorateHeaderBrand(block);
        return;
    }

    if (variant === 'header-v3') {
        decorateHeaderV3(block);
        return;
    }

    if (variant === 'header-firm') {
        decorateHeaderFirm(block);
        return;
    }

    await decorateHeaderDefault(block);
}
