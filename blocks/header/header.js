import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

function createNavLink(link) {
  const li = document.createElement('li');
  li.className = 'global-site-header-link';

  li.append(link);

  return li;
}

function buildHeader(logoImg, links) {
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

export default async function decorate(block) {
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

  const header = buildHeader(
    logoImg?.cloneNode(true),
    navLinks,
  );

  setupMobileMenu(header);

  block.textContent = '';

  block.append(header);
}
