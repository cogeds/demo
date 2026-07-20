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
function buildColumn(colLi) {
  const col = document.createElement('div');
  col.className = 'header-v1-col';

  const label = itemLabel(colLi);
  const href = itemLink(colLi)?.getAttribute('href');
  const links = getFlyoutList(colLi);

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
  primaryItems.forEach((li) => sections.append(buildNavItem(li)));

  if (accountLi) header.querySelector('.header-v1-bar').append(buildAccount(accountLi));

  setupInteractions(header);

  block.textContent = '';
  block.append(header);
}
