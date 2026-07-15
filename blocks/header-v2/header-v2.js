export default async function decorate(block) {
    const rows = [...block.children];

    const getValue = (label) => {
        const row = rows.find(
            (r) =>
                r.children[0]?.textContent?.trim().toLowerCase() ===
                label.toLowerCase(),
        );

        return row?.children[1]?.innerHTML || '';
    };

    const logo = getValue('Logo');
    const alert = getValue('Alert');

    block.innerHTML = `
    <header class="header-v2">

      <a class="header-v2__skip-link" hrefalert">
        ${alert || ''}
      </div>

      <div class="header-v2__main-bar">

        <button
          class="header-v2__hamburger"
          aria-label="Menu"
          aria-expanded="false"
          type="button">

          <span></span>
          <span></span>
          <span></span>

        </button>

        <div class="header-v2__logo">
          ${logo || '/'}
        </div>

        <nav
          class="header-v2__nav"
          aria-label="Primary Navigation">

          <button
            type="button"
            class="header-v2__nav-trigger"
            data-menu="vehicles">
            Vehicles
          </button>

          <button
            type="button"
            class="header-v2__nav-trigger"
            data-menu="shop">
            Shop
          </button>

          <button
            type="button"
            class="header-v2__nav-trigger"
            data-menu="support">
            Support & Service
          </button>

        </nav>

        <div class="header-v2__actions">

          <button
            type="button"
            class="header-v2__icon search-trigger">
            Search
          </button>

          /saves/
            My Saves
          </a>

          <button
            type="button"
            class="header-v2__icon account-trigger">
            Account
          </button>

        </div>

      </div>

      <div class="header-v2__overlay"></div>

      <div
        class="header-v2__mega-menu"
        data-panel="vehicles">

        <div class="header-v2__mega-content">

          <div id="vehicles-menu-container">
            Vehicles Fragment Loading Area
          </div>

        </div>

      </div>

      <div
        class="header-v2__mega-menu"
        data-panel="shop">

        <div class="header-v2__mega-content">

          <div id="shopping-tools-container">
            Shopping Tools Fragment Loading Area
          </div>

        </div>

      </div>

      <div
        class="header-v2__mega-menu"
        data-panel="support">

        <div class="header-v2__mega-content">

          <div id="support-container">
            Support Fragment Loading Area
          </div>

        </div>

      </div>

      <div class="header-v2__account-panel">

        <h3>
          Personalize Your Toyota Experience
        </h3>

        <p>
          Create an account or sign in to access all the
          tools for your Toyota in one place.
        </p>

        /my-dashboard/

          Create Account Or Sign In

        </a>

      </div>

      <div class="header-v2__mobile-drawer">

        <button type="button">Vehicles</button>
        <button type="button">Shop</button>
        <button type="button">Support & Service</button>
        <button type="button">My Toyota</button>

      </div>

    </header>
  `;

    const header = block.querySelector('.header-v2');
    const overlay = header.querySelector('.header-v2__overlay');
    const accountButton = header.querySelector('.account-trigger');
    const accountPanel = header.querySelector('.header-v2__account-panel');
    const hamburger = header.querySelector('.header-v2__hamburger');

    const navButtons = [
        ...header.querySelectorAll('.header-v2__nav-trigger'),
    ];

    function closeAll() {
        header
            .querySelectorAll('.header-v2__mega-menu')
            .forEach((panel) => {
                panel.classList.remove('active');
            });

        accountPanel?.classList.remove('active');
        overlay?.classList.remove('active');
    }

    navButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const panelName = button.dataset.menu;

            const targetPanel = header.querySelector(
                `.header-v2__mega-menu[data-panel="${panelName}"]`,
            );

            if (!targetPanel) {
                return;
            }

            const isOpen =
                targetPanel.classList.contains('active');

            closeAll();

            if (!isOpen) {
                targetPanel.classList.add('active');
                overlay?.classList.add('active');
            }
        });
    });

    if (accountButton && accountPanel) {
        accountButton.addEventListener('click', () => {
            const isOpen =
                accountPanel.classList.contains('active');

            closeAll();

            if (!isOpen) {
                accountPanel.classList.add('active');
                overlay?.classList.add('active');
            }
        });
    }

    overlay?.addEventListener('click', () => {
        closeAll();
    });

    hamburger?.addEventListener('click', () => {
        const expanded =
            hamburger.getAttribute('aria-expanded') === 'true';

        hamburger.setAttribute(
            'aria-expanded',
            String(!expanded),
        );

        header.classList.toggle('mobile-open');
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAll();
        }
    });
}