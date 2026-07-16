export default function decorate(block) {
    const rows = [...block.children];

    const getValue = (label) => {
        const row = rows.find(
            (r) => r.children[0]?.textContent.trim().toLowerCase() === label.toLowerCase(),
        );

        return row?.children[1]?.textContent.trim() || '';
    };

    const logo = getValue('Logo');

    const vehicles = getValue('Vehicles')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    const shopItems = getValue('Shop')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    const supportFragment = getValue('Support Fragment');

    const accountItems = getValue('Account')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    const buildMobileSection = (title, items) => `
    <div class="mobile-menu-group">

      <button
        class="mobile-menu-trigger"
        type="button">
        ${title}
      </button>

      <div class="mobile-submenu">

        ${items.map((item) => `
          #
            ${item}
          </a>
        `).join('')}

      </div>

    </div>
  `;

    block.innerHTML = '';

    const header = document.createElement('header');
    header.className = 'header-v1';

    header.innerHTML = `
    <div class="header-v1-bar">

      <div class="header-v1-logo">
        ${logo}
      </div>

      <button
          class="mobile-menu-toggle"
          type="button"
          aria-label="Open Menu">
          ☰
      </button>

      <nav class="header-v1-nav">

        <div class="menu-group">

          <button class="menu-trigger" type="button">
            Vehicles
          </button>

          <div class="dropdown-menu">
            ${vehicles.map((item) => `
               <
                ${item}
              </a>
            `).join('')}
          </div>

        </div>

        <div class="menu-group">

          <button class="menu-trigger" type="button">
            Shop
          </button>

          <div class="dropdown-menu">
            ${shopItems.map((item) => `
               <
                ${item}
              </a>
            `).join('')}
          </div>

        </div>

        // <div class="menu-group">

        //   <button class="menu-trigger" type="button">
        //     Support
        //   </button>

        //   <div class="dropdown-menu">
        //     ${supportItems.map((item) => `
        //        <
        //         ${item}
        //       </a>
        //     `).join('')}
        //   </div>

        // </div>
        <div class="menu-group">

  <button
    class="menu-trigger"
    type="button">
    Support
  </button>

  <div class="dropdown-menu support-menu-wrapper">

    <div
      id="support-menu-container"
      data-fragment="${supportFragment}">
    </div>

  </div>

</div>

      </nav>

      <div class="header-v1-account">

        <div class="menu-group">

          <button class="menu-trigger" type="button">
            Account
          </button>

          <div class="dropdown-menu account-menu">
            ${accountItems.map((item) => `
              <
                ${item}
              </a>
            `).join('')}
          </div>

        </div>

      </div>

    </div>

    <div class="mobile-menu">

      ${buildMobileSection('Vehicles', vehicles)}

      ${buildMobileSection('Shop', shopItems)}

      ${buildMobileSection('Support', supportItems)}

      ${buildMobileSection('Account', accountItems)}

    </div>
  `;

    block.append(header);

    // Desktop Menus

    const triggers = header.querySelectorAll('.menu-trigger');

    triggers.forEach((trigger) => {
        trigger.addEventListener('click', () => {
            const dropdown = trigger
                .closest('.menu-group')
                .querySelector('.dropdown-menu');

            header
                .querySelectorAll('.dropdown-menu.active')
                .forEach((menu) => {
                    if (menu !== dropdown) {
                        menu.classList.remove('active');
                    }
                });

            requestAnimationFrame(() => {
                dropdown.classList.toggle('active');
            });
        });
    });

    // Mobile Hamburger

    const mobileToggle =
        header.querySelector('.mobile-menu-toggle');

    const mobileMenu =
        header.querySelector('.mobile-menu');

    mobileToggle?.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });

    // Mobile Sections

    const mobileTriggers =
        header.querySelectorAll('.mobile-menu-trigger');

    mobileTriggers.forEach((trigger) => {
        trigger.addEventListener('click', () => {
            const submenu =
                trigger.nextElementSibling;

            submenu.classList.toggle('active');
        });
    });

    // Click Outside

    document.addEventListener('click', (event) => {
        if (!header.contains(event.target)) {

            header
                .querySelectorAll('.dropdown-menu')
                .forEach((menu) => {
                    menu.classList.remove('active');
                });

            mobileMenu?.classList.remove('active');

            header
                .querySelectorAll('.mobile-submenu')
                .forEach((submenu) => {
                    submenu.classList.remove('active');
                });
        }
    });
}
