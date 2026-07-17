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

/** the link inside an <li>, if the label was authored as a link */
function itemLink(li) {
  return li.querySelector(':scope > a');
}

/** the text label of an <li>, ignoring any nested list */
function itemLabel(li) {
  const link = itemLink(li);
  if (link) return link.textContent.trim();
  return [...li.childNodes]
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent)
    .join(' ')
    .trim();
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
  trigger.innerHTML = `<span>${label}</span><span class="header-v1-caret" aria-hidden="true"></span>`;

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

/**
 * Wires the desktop mega-menu (hover + click) and mobile accordion behaviour.
 * @param {Element} header
 */
function setupInteractions(header) {
  const nav = header.querySelector('.header-v1-nav');
  const overlay = header.querySelector('.header-v1-overlay');
  const hamburger = header.querySelector('.header-v1-hamburger');
  const items = [...header.querySelectorAll('.header-v1-item.has-flyout')];

  const openItem = (item) => {
    closeFlyouts(nav, item);
    item.classList.add('open');
    item.querySelector('.header-v1-trigger')?.setAttribute('aria-expanded', 'true');
    overlay?.classList.add('active');
  };

  const closeAll = () => {
    closeFlyouts(nav);
    overlay?.classList.remove('active');
  };

  items.forEach((item) => {
    const trigger = item.querySelector('.header-v1-trigger');

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      if (isOpen) {
        closeAll();
      } else {
        openItem(item);
      }
    });

    // hover intent for pointer devices on desktop only
    item.addEventListener('mouseenter', () => {
      if (isDesktop.matches) openItem(item);
    });
    item.addEventListener('mouseleave', () => {
      if (isDesktop.matches) closeAll();
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
  sourceItems.forEach((li) => sections.append(buildNavItem(li)));

  setupInteractions(header);

  block.textContent = '';
  block.append(header);
}
