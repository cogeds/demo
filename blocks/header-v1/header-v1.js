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

    block.innerHTML = '';

    const header = document.createElement('header');
    header.className = 'header-v1';

    header.innerHTML = `
    <div class="header-v1-bar">

      <div class="header-v1-logo">
        ${logo}
      </div>

      <nav class="header-v1-nav">

        <button
          class="menu-trigger"
          type="button">
          Vehicles
        </button>

        <div class="dropdown-menu">

          ${vehicles.map((vehicle) => `
            #
              ${vehicle}
            </a>
          `).join('')}

        </div>

      </nav>

    </div>
  `;

    block.append(header);

    const trigger = header.querySelector('.menu-trigger');
    const dropdown = header.querySelector('.dropdown-menu');

    trigger.addEventListener('click', () => {
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', (event) => {
        if (!header.contains(event.target)) {
            dropdown.classList.remove('active');
        }
    });
}