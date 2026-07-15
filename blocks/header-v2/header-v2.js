export default async function decorate(block) {
    const rows = [...block.children];

    const getValue = (name) => {
        const row = rows.find(
            (r) =>
                r.children[0]?.textContent
                    ?.trim()
                    .toLowerCase() === name.toLowerCase(),
        );

        return row?.children[1];
    };

    const logo = getValue('Logo')?.innerHTML || '';
    const alert = getValue('Alert')?.innerHTML || '';

    block.innerHTML = `
    <header class="header-v2">

      <a
        href="#main-content"
        class="header-v2__skip-link">
        Skip to main content
      </a-v2__main-bar">

        <button
          class="header-v2__hamburger"
          aria-label="Open navigation">

          <span></span>
          <span></span>
          <span></span>

        </button>

        <div class="header-v2__logo">
          ${logo}
        </div>

        <nav
          class="header-v2__nav"
          aria-label="Primary">

          <button
            class="header-v2__nav-trigger"
            data-menu="vehicles">
            Vehicles
          </button>

          <button
            class="header-v2__nav-trigger"
            data-menu="shop">
            Shop
          </button>

          <button
            class="header-v2__nav-trigger"
            data-menu="support">
            Support & Service
          </button>

        </nav>

        <div class="header-v2__actions">

          <button
            class="header-v2__icon search-trigger">
            Search
          </button>

          <a
            href="/ Saves
          </a>

          <button
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
          <div id="vehicles-menu-container"></div>
        </div>

      </div>

      <div
        class="header-v2__mega-menu"
        data-panel="shop">

        <div class="header-v2__mega-content">
          <div id="shopping-tools-container"></div>
        </div>

      </div>

      <div
        class="header-v2__mega-menu"
        data-panel="support">

        <div class="header-v2__mega-content">
          <div id="support-container"></div>
        </div>

      </div>

      <div class="header-v2__account-panel">

        <h3>
          Personalize Your Toyota Experience
        </h3>

        <p>
          Create an account or sign in to access
          all the tools for your Toyota in one place.
        </p>

        /my-dashboard/="header-v2__button">

          Create Account Or Sign In

        </a>

      </div>

      <div class="header-v2__mobile-drawer">

        <button
          data-mobile="vehicles">
          Vehicles
        </button>

        <button
          data-mobile="shop">
          Shop
        </button>

        <button
          data-mobile="support">
          Support & Service
        </button>

        <button
          data-mobile="account">
          My Toyota
        </button>

      </div>

    </header>
  `;

    const header = block.querySelector('.header-v2');
    const overlay = block.querySelector('.header-v2__overlay');

    function closeAll() {
        header
            .querySelectorAll('.header-v2__mega-menu')
            .forEach((panel) => panel.classList.remove('active'));

        header
            .querySelector('.header-v2__account-panel')
            .classList.remove('active');

        overlay.classList.remove('active');
    }

    header
        .querySelectorAll('.header-v2__nav-trigger')
        .forEach((button) => {
            button.addEventListener('click', () => {
                const panel = button.dataset.menu;

                const target =
                    header.querySelector(
                        `.header-v2__mega-menu[data-panel="${panel}"]`,
                    );

                const open =
                    target.classList.contains('active');

                closeAll();

                if (!open) {
                    target.classList.add('active');
                    overlay.classList.add('active');
                }
            });
        });

    const account =
        header.querySelector('.account-trigger');

    account.addEventListener('click', () => {
        const panel = header.querySelector(
            '.header-v2__account-panel',
        );

        const open =
            panel.classList.contains('active');

        closeAll();

        if (!open) {
            panel.classList.add('active');
            overlay.classList.add('active');
        }
    });

    overlay.addEventListener('click', closeAll);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAll();
        }
    });

    const hamburger =
        header.querySelector('.header-v2__hamburger');

    hamburger.addEventListener('click', () => {
        header.classList.toggle('mobile-open');
    });
}