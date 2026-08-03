import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

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
export default async function decorate(block) {
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
