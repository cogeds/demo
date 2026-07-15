export default function decorate(block) {
    const rows = [...block.children];

    const getValue = (label) => {
        const row = rows.find(
            (r) =>
                r.children[0]?.textContent.trim().toLowerCase()
                === label.toLowerCase(),
        );

        return row?.children[1]?.textContent.trim() || '';
    };

    const logo = getValue('Logo');
    const vehicles = getValue('Vehicles')
        .split(',')
        .map((item) => item.trim());

    const shopItems = getValue('Shop')
        .split(',')
        .map((item) => item.trim());

    const supportItems = getValue('Support')
        .split(',')
        .map((item) => item.trim());

    const accountItems = getValue('Account')
        .split(',')
        .map((item) => item.trim());

    block.innerHTML = '';

    const header = document.createElement('header');
    header.className = 'header-v1';

    header.innerHTML = `
    <header class="header-v1">

  <div class="header-v1-bar">

    <div class="header-v1-logo">
      ${logo}
    </div>

    <nav class="header-v1-nav">

      <!-- Vehicles -->
      <div class="menu-group">
        <button
          class="menu-trigger"
          type="button">
          Vehicles
        </button>

        <div class="dropdown-menu">
          ${vehicles.map((item) => `
  #
    ${item}
  </a>
`).join('')}
        </div>
      </div>

      <!-- Shop -->
      <div class="menu-group">
        <button
          class="menu-trigger"
          type="button">
          Shop
        </button>

        <div class="dropdown-menu">
          ${shopItems.map((item) => `
            #
    ${item}
  </a>
          `).join('')}
        </div>
      </div>

      <!-- Support -->
      <div class="menu-group">
        <button
          class="menu-trigger"
          type="button">
          Support
        </button>

        <div class="dropdown-menu">
          ${supportItems.map((item) => `
            #
              ${item}
            </a>
          `).join('')}
        </div>
      </div>

    </nav>

    <!-- Right Side Account -->

    <div class="header-v1-account">

      <div class="menu-group">

        <button
          class="menu-trigger"
          type="button">
          Account
        </button>

        <div class="dropdown-menu account-menu">

          ${accountItems.map((item) => `
            #
    ${item}
  </a>
          `).join('')}

        </div>

      </div>

    </div>

  </div>

</header>
  `;

    block.append(header);

    const triggers = header.querySelectorAll('.menu-trigger');

    triggers.forEach((trigger) => {
        trigger.addEventListener('click', () => {

            const menuGroup =
                trigger.closest('.menu-group');

            const dropdown =
                menuGroup.querySelector('.dropdown-menu');

            document
                .querySelectorAll('.dropdown-menu.active')
                .forEach((menu) => {
                    if (menu !== dropdown) {
                        menu.classList.remove('active');
                    }
                });

            dropdown.classList.toggle('active');

        });
    });

    document.addEventListener('click', (event) => {
        if (!header.contains(event.target)) {
            dropdown.classList.remove('active');
        }
    });
}