function createVehicleCard(data) {
    return `
    <article class="vehicle-card">
      <div class="vehicle-card-image">
        ${data.image}
      </div>

      ${data.badge ? `
        <span class="vehicle-card-badge">
          ${data.badge}
        </span>
      ` : ''}

      <h3 class="vehicle-card-title">
        ${data.model}
      </h3>

      <div class="vehicle-card-year">
        ${data.year}
      </div>

      <div class="vehicle-card-msrp">
        ${data.msrp} Starting MSRP
      </div>

      <div class="vehicle-card-actions">
        ${data.buildLink}
          Build
        </a>

        }">
          Shop
        </a>
      </div>
    </article>
  `;
}

export default async function decorate(block) {
    const cards = [...block.querySelectorAll('.vehicle-card-data')];

    const html = cards.map((card) =>
        createVehicleCard({
            image: card.dataset.image,
            badge: card.dataset.badge,
            model: card.dataset.model,
            year: card.dataset.year,
            msrp: card.dataset.msrp,
            buildLink: card.dataset.build,
            shopLink: card.dataset.shop,
        }),
    ).join('');

    block.innerHTML = `
    <div class="vehicles-menu">

      <aside class="vehicles-menu-sidebar">

        <button data-category="suv">
          Crossovers & SUVs
        </button>

        <button data-category="cars">
          Cars & Minivan
        </button>

        <button data-category="trucks">
          Trucks
        </button>

        <button data-category="performance">
          Performance
        </button>

        <button data-category="electrified">
          Electrified
        </button>

      </aside>

      <div class="vehicles-menu-content">
        ${html}
      </div>

    </div>
  `;
}