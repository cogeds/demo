// media query used to switch between the desktop mega-menu and the mobile drawer
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Returns the direct child list of an LI, if it has one.
 * @param {Element} li
 * @returns {Element|null}
 */
function getFlyoutList(li) {
  return li.querySelector(':scope > ul, :scope > ol');
}

/**
 * Returns direct child list items of a list element.
 * @param {Element} list
 * @returns {Element[]}
 */
function childItems(list) {
  if (!list) return [];
  return [...list.children].filter((el) => el.tagName === 'LI');
}

/**
 * Returns the direct link of a list item, ignoring links inside nested lists.
 * @param {Element} li
 * @returns {HTMLAnchorElement|null}
 */
function itemLink(li) {
  const sublist = getFlyoutList(li);
  const anchors = [...li.querySelectorAll('a')];

  return anchors.find((anchor) => !sublist || !sublist.contains(anchor)) || null;
}

/**
 * Returns the label text of a list item, ignoring nested lists.
 * @param {Element} li
 * @returns {string}
 */
function itemLabel(li) {
  const link = itemLink(li);
  if (link && link.textContent.trim()) return link.textContent.trim();

  const clone = li.cloneNode(true);
  clone.querySelectorAll('ul, ol').forEach((sub) => sub.remove());

  return clone.textContent.replace(/\s+/g, ' ').trim();
}

/**
 * Builds a link.
 * @param {string} className
 * @param {string} label
 * @param {string} href
 * @returns {HTMLAnchorElement}
 */
function buildLink(className, label, href) {
  const a = document.createElement('a');
  if (className) a.className = className;
  a.href = href || '#';
  a.textContent = label || '';
  return a;
}

/**
 * Closes every open flyout.
 * @param {Element} nav
 * @param {Element} except
 */
function closeFlyouts(nav, except) {
  nav?.querySelectorAll('.header-v1-item.open').forEach((item) => {
    if (item === except) return;

    item.classList.remove('open');
    item.querySelector('.header-v1-trigger')?.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Returns promo column type based on label.
 * @param {string} label
 * @returns {string}
 */
function getColumnType(label) {
  if (/\[promo\]/i.test(label)) return 'promo';
  return 'default';
}

/**
 * Removes authoring marker from label.
 * @param {string} label
 * @returns {string}
 */
function cleanLabel(label) {
  return label.replace(/\[promo\]/i, '').trim();
}

/**
 * Builds one mega menu column.
 * @param {Element} colLi
 * @returns {HTMLDivElement}
 */
function buildColumn(colLi) {
  const rawLabel = itemLabel(colLi);
  const colType = getColumnType(rawLabel);
  const label = cleanLabel(rawLabel);
  const href = itemLink(colLi)?.getAttribute('href');
  const links = getFlyoutList(colLi);

  const col = document.createElement('div');
  col.className = `header-v1-col ${colType === 'promo' ? 'header-v1-col-promo' : ''}`.trim();

  if (!links) {
    col.append(buildLink('header-v1-col-link', label, href));
    return col;
  }

  const heading = document.createElement('h3');
  heading.className = 'header-v1-col-title';

  if (href) {
    heading.append(buildLink('', label, href));
  } else {
    heading.textContent = label;
  }

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

/**
 * Checks whether the nav item is Vehicles.
 * @param {Element} li
 * @returns {boolean}
 */
function isVehiclesItem(li) {
  return /^vehicles$/i.test(itemLabel(li));
}

/**
 * Builds a vehicle card from authored LI.
 * @param {Element} li
 * @returns {HTMLDivElement}
 */
function buildVehicleCard(li) {
  const card = document.createElement('div');
  card.className = 'vehicle-card';

  const anchors = [...li.querySelectorAll('a')];

  const build = anchors.find((a) => /build/i.test(a.textContent));
  const shop = anchors.find((a) => /shop/i.test(a.textContent));

  const others = anchors.filter((a) => a !== build && a !== shop);
  const modelLink = others.find((a) => a.textContent.trim()) || others[0];

  const media = li.querySelector('picture') || li.querySelector('img');

  const clone = li.cloneNode(true);
  clone.querySelectorAll('a, picture, img, ul, ol').forEach((el) => el.remove());

  const lines = clone.textContent
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const priceLines = lines.filter((line) => line.includes('$'));
  const asShown = priceLines.find((line) => /as shown/i.test(line)) || '';
  const price = priceLines.find((line) => line !== asShown) || '';
  const year = lines.find((line) => /^\d{4}$/.test(line)) || '';
  const badge = lines.find((line) => !line.includes('$') && line !== year) || '';

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
    const yearSelector = document.createElement('div');
    yearSelector.className = 'year-selector';

    const activeYear = document.createElement('div');
    activeYear.className = 'active';
    activeYear.textContent = year;

    yearSelector.append(activeYear);
    card.append(yearSelector);
  }

  if (name) {
    const heading = document.createElement('h3');
    heading.append(buildLink('', name, href));
    card.append(heading);
  }

  if (price) {
    const p = document.createElement('p');
    p.textContent = price;
    card.append(p);
  }

  const actions = document.createElement('div');
  actions.className = 'vehicle-actions';

  if (build) {
    actions.append(buildLink('', build.textContent.trim() || 'Build', build.getAttribute('href')));
  }

  if (shop) {
    actions.append(buildLink('', shop.textContent.trim() || 'Shop', shop.getAttribute('href')));
  }

  if (actions.children.length) card.append(actions);

  return card;
}

/**
 * Appends vehicle grid.
 * @param {Element} slide
 * @param {Element[]} items
 */
function appendVehicleGrid(slide, items) {
  const grid = document.createElement('div');
  grid.className = 'vehicles-grid';

  items.forEach((v) => {
    grid.append(buildVehicleCard(v));
  });

  slide.append(grid);
}

/**
 * Builds Vehicles mega menu.
 * @param {Element} li
 * @returns {HTMLLIElement}
 */
function buildVehiclesItem(li) {
  const item = document.createElement('li');
  item.className = 'header-v1-item has-flyout vehicles';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'header-v1-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-haspopup', 'true');

  const triggerText = document.createElement('span');
  triggerText.textContent = itemLabel(li);
  trigger.append(triggerText);

  const flyout = document.createElement('div');
  flyout.className = 'header-v1-flyout vehicles-flyout';

  const menu = document.createElement('div');
  menu.className = 'vehicles-menu';

  const left = document.createElement('div');
  left.className = 'vehicles-left';

  const allModels = document.createElement('p');
  allModels.className = 'vehicles-all-models-title';
  allModels.textContent = 'All Models';

  const catList = document.createElement('ul');
  catList.className = 'vehicles-cats';

  left.append(allModels, catList);

  const right = document.createElement('div');
  right.className = 'vehicles-right';

  const categories = childItems(getFlyoutList(li));

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

    const children = childItems(getFlyoutList(catLi));
    const hasSubs = children.some((child) => getFlyoutList(child));

    if (hasSubs) {
      children.forEach((sub) => {
        const heading = document.createElement('p');
        heading.className = 'vehicles-subcat';
        heading.textContent = itemLabel(sub);
        slide.append(heading);

        appendVehicleGrid(slide, childItems(getFlyoutList(sub)));
      });
    } else {
      appendVehicleGrid(slide, children);
    }

    right.append(slide);
  });

  catList.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-cat]');
    if (!btn) return;

    catList.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', b === btn);
    });

    right.querySelectorAll('.vehicles-slide').forEach((slide) => {
      slide.classList.toggle('active', slide.dataset.cat === btn.dataset.cat);
    });
  });

  menu.append(left, right);
  flyout.append(menu);
  item.append(trigger, flyout);

  return item;
}

/**
 * Builds regular nav item.
 * @param {Element} li
 * @returns {HTMLLIElement}
 */
function buildNavItem(li) {
  const item = document.createElement('li');
  item.className = 'header-v1-item';

  const label = itemLabel(li);
  const href = itemLink(li)?.getAttribute('href');
  const flyoutList = getFlyoutList(li);

  if (!flyoutList) {
    item.append(buildLink('header-v1-link', label, href));
    return item;
  }

  item.classList.add('has-flyout');

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'header-v1-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-haspopup', 'true');

  const triggerText = document.createElement('span');
  triggerText.textContent = label;
  trigger.append(triggerText);

  const flyout = document.createElement('div');
  flyout.className = 'header-v1-flyout';

  const inner = document.createElement('div');
  inner.className = 'header-v1-flyout-inner';

  childItems(flyoutList).forEach((colLi) => {
    inner.append(buildColumn(colLi));
  });

  flyout.append(inner);
  item.append(trigger, flyout);

  return item;
}

const ICON_USER = '👤';
const ICON_ARROW = '›';
const ICON_BELL = '🔔';
const ICON_HEART = '♡';
const ICON_GEAR = '⚙';
const ICON_DOT = '•';

/**
 * Picks account row icon.
 * @param {string} label
 * @returns {string}
 */
function accountRowIcon(label) {
  const key = label.toLowerCase();

  if (key.includes('notif')) return ICON_BELL;
  if (key.includes('save')) return ICON_HEART;
  if (key.includes('setting')) return ICON_GEAR;

  return ICON_DOT;
}

/**
 * Builds one account row.
 * @param {Element} li
 * @returns {Element}
 */
function buildAccountRow(li) {
  const rawLabel = itemLabel(li);
  const href = itemLink(li)?.getAttribute('href') || '#';
  const notesList = getFlyoutList(li);
  const notes = notesList ? childItems(notesList).map((note) => itemLabel(note)) : [];

  const countMatch = rawLabel.match(/\((\d+)\)\s*$/);
  const count = countMatch ? countMatch[1] : '';
  const label = rawLabel.replace(/\s*\(\d+\)\s*$/, '');
  const icon = accountRowIcon(label);

  if (notes.length) {
    const wrap = document.createElement('div');
    wrap.className = 'link link-notifications';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'link-notifications-content';
    button.setAttribute('aria-expanded', 'false');

    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.textContent = icon;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'label';
    labelSpan.textContent = label;

    if (count) {
      const countSpan = document.createElement('span');
      countSpan.className = 'count';
      countSpan.textContent = count;
      labelSpan.append(countSpan);
    }

    button.append(iconSpan, labelSpan);

    const panel = document.createElement('div');
    panel.className = 'notifications-panel';

    notes.forEach((note) => {
      const p = document.createElement('p');
      p.textContent = note;
      panel.append(p);
    });

    const clear = document.createElement('a');
    clear.className = 'clear-btn';
    clear.href = '#';
    clear.textContent = 'Clear All';

    panel.append(clear);
    wrap.append(button, panel);

    return wrap;
  }

  const link = document.createElement('a');
  link.className = 'link';
  link.href = href;

  const iconSpan = document.createElement('span');
  iconSpan.className = 'icon';
  iconSpan.setAttribute('aria-hidden', 'true');
  iconSpan.textContent = icon;

  const labelSpan = document.createElement('span');
  labelSpan.className = 'label';
  labelSpan.textContent = label;

  if (count) {
    const countSpan = document.createElement('span');
    countSpan.className = 'count';
    countSpan.textContent = count;
    labelSpan.append(countSpan);
  }

  link.append(iconSpan, labelSpan);

  return link;
}

/**
 * Builds account panel.
 * @param {Element} accountLi
 * @returns {HTMLDivElement}
 */
function buildAccount(accountLi) {
  const triggerLabel = accountLi ? itemLabel(accountLi) : 'Account';

  const list = accountLi ? getFlyoutList(accountLi) : null;
  const children = list ? childItems(list) : [];

  const textItems = children.filter((li) => !itemLink(li));
  const linkItems = children.filter((li) => itemLink(li));

  const title = textItems[0]
    ? itemLabel(textItems[0])
    : 'Personalize Your Toyota Experience';

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

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'header-v1-account-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-haspopup', 'true');

  const triggerIcon = document.createElement('span');
  triggerIcon.className = 'header-v1-account-icon';
  triggerIcon.setAttribute('aria-hidden', 'true');
  triggerIcon.textContent = ICON_USER;

  const triggerText = document.createElement('span');
  triggerText.className = 'header-v1-account-label';
  triggerText.textContent = triggerLabel;

  trigger.append(triggerIcon, triggerText);

  const panel = document.createElement('div');
  panel.className = 'header-v1-account-panel my-toyota-view';
  panel.dataset.wrapper = 'mytoyota';

  const loggedOut = document.createElement('div');
  loggedOut.className = 'account-logged-out-block';

  const titleEl = document.createElement('div');
  titleEl.className = 'account-title';
  titleEl.textContent = title;

  loggedOut.append(titleEl);

  descriptions.forEach((description) => {
    const p = document.createElement('p');
    p.textContent = description;
    loggedOut.append(p);
  });

  const ctas = document.createElement('div');
  ctas.className = 'ctas';

  const ctaLink = document.createElement('a');
  ctaLink.className = 'button primary sign-in-btn';
  ctaLink.href = cta.href;

  const ctaText = document.createElement('span');
  ctaText.className = 'link-text btn-text';
  ctaText.textContent = cta.label;

  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = ICON_ARROW;

  ctaText.append(arrow);
  ctaLink.append(ctaText);
  ctas.append(ctaLink);
  loggedOut.append(ctas);

  const links = document.createElement('div');
  links.className = 'links';

  rows.forEach((li) => {
    links.append(buildAccountRow(li));
  });

  panel.append(loggedOut, links);
  wrap.append(trigger, panel);

  return wrap;
}

/**
 * Gets row from EDS block.
 * Row index is zero-based.
 * @param {Element} block
 * @param {number} index
 * @returns {Element|null}
 */
function getBlockRow(block, index) {
  return block.children[index] || null;
}

/**
 * Gets all cells from an EDS block row.
 * @param {Element} row
 * @returns {Element[]}
 */
function getRowCells(row) {
  if (!row) return [];

  return [...row.children];
}

/**
 * Gets logo from row 2.
 * @param {Element} block
 * @returns {Element|null}
 */
function getAuthoredLogo(block) {
  const logoRow = getBlockRow(block, 1);
  const logoCells = getRowCells(logoRow);

  const logoSource = logoCells.length > 1 ? logoCells[1] : logoCells[0];

  if (!logoSource) return null;

  const authoredLogoLink = logoSource.querySelector('a');
  const authoredPicture = logoSource.querySelector('picture');
  const authoredImg = logoSource.querySelector('img');

  if (authoredLogoLink) {
    return authoredLogoLink.cloneNode(true);
  }

  if (authoredPicture) {
    return authoredPicture.cloneNode(true);
  }

  if (authoredImg) {
    return authoredImg.cloneNode(true);
  }

  return null;
}

/**
 * Gets navigation source items from row 3.
 * @param {Element} block
 * @returns {Element[]}
 */
function getAuthoredNavItems(block) {
  const navRow = getBlockRow(block, 2);
  const navCells = getRowCells(navRow);

  const navSource = navCells.length > 1 ? navCells[1] : navCells[0];

  if (!navSource) return [];

  return [...navSource.querySelectorAll('ul, ol')]
    .filter((list) => !list.closest('li'))
    .flatMap((list) => childItems(list));
}

/**
 * Wires desktop mega menu, account panel and mobile drawer.
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
    row?.classList.toggle('expanded', !expanded);
  });

  items.forEach((item) => {
    const trigger = item.querySelector('.header-v1-trigger');

    trigger?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      if (isOpen) {
        closeAll();
      } else {
        openItem(item);
      }
    });
  });

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

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target) && isDesktop.matches) {
      closeAll();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    closeAll();

    header.classList.remove('mobile-open');
    hamburger?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('header-v1-no-scroll');
  });

  isDesktop.addEventListener('change', () => {
    closeAll();

    header.classList.remove('mobile-open');
    hamburger?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('header-v1-no-scroll');
  });
}

/**
 * Loads and decorates the header-v1 block.
 * Authoring expectation:
 * Row 1: component name
 * Row 2: logo
 * Row 3: sub menus / navigation nested list
 *
 * @param {Element} block
 */
export default async function decorate(block) {
  const logo = getAuthoredLogo(block);
  const sourceItems = getAuthoredNavItems(block);

  const isAccountItem = (li) => /^(account|my\s*toyota)$/i.test(itemLabel(li));

  const accountLi = sourceItems.find(isAccountItem);
  const primaryItems = sourceItems.filter((li) => li !== accountLi);

  const header = document.createElement('header');
  header.className = 'header-v1';

  header.innerHTML = `
    <div class="header-v1-bar">
      /</a>

      <button
        class="header-v1-hamburger"
        type="button"
        aria-label="Toggle navigation"
        aria-expanded="false"
        aria-controls="header-v1-nav">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav id="header-v1-nav" class="header-v1-nav" aria-label="Primary">
        <ul class="header-v1-sections"></ul>
      </nav>
    </div>

    <div class="header-v1-overlay"></div>
  `;

  const brand = header.querySelector('.header-v1-brand');

  if (logo) {
    brand.append(logo);
  }

  const sections = header.querySelector('.header-v1-sections');

  primaryItems.forEach((li) => {
    sections.append(isVehiclesItem(li) ? buildVehiclesItem(li) : buildNavItem(li));
  });

  if (accountLi) {
    header.querySelector('.header-v1-bar').append(buildAccount(accountLi));
  }

  setupInteractions(header);

  block.textContent = '';
  block.append(header);
}