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

    block.innerHTML = '';

    const header = document.createElement('header');
    header.className = 'header-v1';

    header.innerHTML = `
    <div class="header-v1-logo">
      ${logo || 'Toyota'}
    </div>
    <nav class="header-v1-nav">

  <div class="menu-group">

    <button
      class="menu-trigger"
      data-menu="vehicles"
      type="button">
      Vehicles
    </button>

    <div class="dropdown-menu">

      ${vehicles.map((vehicle) => `
        <a href="#">
          ${vehicle}
        </a>
      `).join('')}

    </div>

  </div>

  <div class="menu-group">

    <button
      class="menu-trigger"
      data-menu="shop"
      type="button">
      Shop
    </button>

    <div class="dropdown-menu">

      ${shopItems.map((item) => `
        <a href="#">
          ${item}
        </a>
      `).join('')}

    </div>


</div>
<div class="menu-group">

  <button
    class="menu-trigger"
    data-menu="support"
    type="button">
    Support
  </button>

  <div class="dropdown-menu">

    ${supportItems.map((item) => `
        <a href="#">
          ${item}
        </a>
    `).join('')}

  </div>
  </div>

</nav>
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