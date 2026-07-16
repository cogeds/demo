export default function decorate(block) {
    const rows = [...block.children];

    const getValue = (label) => {
        const row = rows.find(
            (r) => r.children[0]?.textContent.trim() === label,
        );

        return row?.children[1]?.textContent.trim() || '';
    };

    const learnLinks = getValue('Learn About Your Toyota')
        .split(',')
        .map((item) => item.trim());

    const maintainLinks = getValue('Maintain Your Toyota')
        .split(',')
        .map((item) => item.trim());

    const title = getValue('My Toyota Title');

    const description = getValue(
        'My Toyota Description',
    );

    const cta = getValue('My Toyota CTA');

    block.innerHTML = `
    <div class="support-menu">

      <div class="support-column">

        <h3>Learn About Your Toyota</h3>

        ${learnLinks.map((item) => `
          #
        `).join('')}

      </div>

      <div class="support-column">

        <h3>Maintain Your Toyota</h3>

        ${maintainLinks.map((item) => `
          #
            ${item}
          </a>
        `).join('')}

      </div>

      <div class="support-callout">

        <h3>${title}</h3>

        <p>${description}</p>

        #
          ${cta}
        </a>

      </div>

    </div>
  `;
}