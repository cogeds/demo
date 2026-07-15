function createElement(tag, attributes = {}, children = []) {
    const el = document.createElement(tag);

    Object.entries(attributes).forEach(([key, value]) => {
        if (key === "class") {
            el.className = value;
        } else {
            el.setAttribute(key, value);
        }
    });

    children.forEach((child) => {
        if (typeof child === "string") {
            el.append(document.createTextNode(child));
        } else {
            el.append(child);
        }
    });

    return el;
}

function buildLogo(block) {
    const logoRow = [...block.children].find(
        (row) => row.firstElementChild?.textContent?.trim() === "Logo",
    );

    if (!logoRow) {
        return "";
    }

    const link = logoRow.querySelector("a");
    const image = logoRow.querySelector("img");

    return `
    ${link?.href || "/"}
      ${image?.outerHTML || ""}
    </a>
  `;
}

function buildNavigation(block) {
    const navRow = [...block.children].find(
        (row) => row.firstElementChild?.textContent?.trim() === "Primary Nav",
    );

    const navLinks = [...(navRow?.querySelectorAll("a") || [])];

    return `
    <ul class="header-nav-list">
      ${navLinks
            .map(
                (link) => `
        <li>
          ${link.href}
            ${link.textContent}
          </a>
        </li>
      `,
            )
            .join("")}
    </ul>
  `;
}

function buildUtilityNav(block) {
    const utilityRow = [...block.children].find(
        (row) => row.firstElementChild?.textContent?.trim() === "Utility Nav",
    );

    const links = [...(utilityRow?.querySelectorAll("a") || [])];

    return `
    <ul class="header-utility-list">
      ${links
            .map(
                (link) => `
        <li>
          ${link.href}
        </li>
      `,
            )
            .join("")}
    </ul>
  `;
}

function initMobileMenu(header) {
    const button = header.querySelector(".header-mobile-toggle");
    const nav = header.querySelector(".header-navigation");

    button?.addEventListener("click", () => {
        const expanded = button.getAttribute("aria-expanded") === "true";

        button.setAttribute("aria-expanded", !expanded);
        header.classList.toggle("menu-open");
        nav.classList.toggle("active");
    });
}

function initVehiclesTrigger(header) {
    const trigger = header.querySelector('[data-menu="vehicles"]');
    const panel = header.querySelector(".header-mega-menu");

    if (!trigger || !panel) return;

    trigger.addEventListener("mouseenter", () => {
        panel.classList.add("active");
    });

    trigger.addEventListener("mouseleave", () => {
        panel.classList.remove("active");
    });

    panel.addEventListener("mouseenter", () => {
        panel.classList.add("active");
    });

    panel.addEventListener("mouseleave", () => {
        panel.classList.remove("active");
    });
}

function initAccountFlyout(header) {
    const trigger = header.querySelector(".account-trigger");
    const flyout = header.querySelector(".account-panel");

    if (!trigger || !flyout) return;

    trigger.addEventListener("click", () => {
        flyout.classList.toggle("active");
    });

    document.addEventListener("click", (event) => {
        if (!flyout.contains(event.target) && !trigger.contains(event.target)) {
            flyout.classList.remove("active");
        }
    });
}

export default async function decorate(block) {
    const logoMarkup = buildLogo(block);
    const navMarkup = buildNavigation(block);
    const utilityMarkup = buildUtilityNav(block);

    block.innerHTML = "";

    const header = createElement("header", {
        class: "tmna-header",
    });

    header.innerHTML = `
    <div class="header-container">

      <button
        class="header-mobile-toggle"
        aria-label="Toggle Navigation"
        aria-expanded="false">
        <span></span>
        <span></span>
        <span></span>
      </button>

      ${logoMarkup}

      <nav
        class="header-navigation"
        aria-label="Main navigation">

        ${navMarkup}

      </nav>

      <div class="header-utility">

        ${utilityMarkup}

        <button
          class="account-trigger"
          aria-label="Account">
          Account
        </button>

      </div>

    </div>

    <div class="header-mega-menu">

      <div class="mega-menu-content">

        <div class="mega-column">
          <h3>Vehicles</h3>
          <div id="vehicles-fragment"></div>
        </div>

        <div class="mega-column">
          <h3>Shopping Tools</h3>
          <div id="shopping-tools-fragment"></div>
        </div>

      </div>

    </div>

    <div class="account-panel">

      <h3>Personalize Your Toyota Experience</h3>

      <p>
        Create an account or sign in to access all the tools
        for your Toyota in one place.
      </p>

      <a href="/my-dashboard/">My Dashboard</a>

    </div>
`;

    block.append(header);

    initMobileMenu(header);
    initVehiclesTrigger(header);
    initAccountFlyout(header);
}
