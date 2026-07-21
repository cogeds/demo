function normalizeKey(key) {
    return key
        ?.toLowerCase()
        .trim()
        .replace(/\s+/g, '-');
}

function getCellText(cell) {
    return cell?.textContent?.trim() || '';
}

function getCellHTML(cell) {
    return cell?.innerHTML?.trim() || '';
}

function getHref(cell) {
    const link = cell?.querySelector('a');
    if (link?.href) return link.href;

    const text = getCellText(cell);
    return text || '#';
}

function getConfig(block) {
    const config = {};

    [...block.children].forEach((row) => {
        const cells = [...row.children];
        if (cells.length < 2) return;

        const key = normalizeKey(getCellText(cells[0]));
        const valueCell = cells[1];

        if (key) {
            config[key] = valueCell;
        }
    });

    return config;
}

function createIcon(iconCell, iconAltCell) {
    const iconWrap = document.createElement('div');
    iconWrap.className = 'signin-card-icon';

    const existingImage = iconCell?.querySelector('img, picture');

    if (existingImage) {
        iconWrap.append(existingImage.cloneNode(true));
        return iconWrap;
    }

    const iconPath = getCellText(iconCell);
    const iconAlt = getCellText(iconAltCell) || 'User Icon';

    if (iconPath) {
        const img = document.createElement('img');
        img.src = iconPath;
        img.alt = iconAlt;
        img.setAttribute('aria-label', iconAlt);
        img.loading = 'lazy';
        iconWrap.append(img);
    }

    return iconWrap;
}

function createDescription(descriptionCell) {
    const description = document.createElement('div');
    description.className = 'signin-card-description';

    const html = getCellHTML(descriptionCell);

    if (html) {
        description.innerHTML = html;
    }

    if (!description.querySelector('p')) {
        const text = getCellText(descriptionCell);
        description.innerHTML = '';

        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        description.append(paragraph);
    }

    return description;
}

function createButton(labelCell, urlCell, className, ariaLabel) {
    const label = getCellText(labelCell);
    const href = getHref(urlCell);

    if (!label) return null;

    const link = document.createElement('a');
    link.className = `signin-card-btn ${className}`;
    link.href = href;
    link.textContent = label;
    link.setAttribute('aria-label', ariaLabel || label);

    return link;
}

function createDivider(dividerTextCell) {
    const dividerText = getCellText(dividerTextCell) || 'or';

    const divider = document.createElement('div');
    divider.className = 'signin-card-divider';
    divider.setAttribute('aria-hidden', 'true');

    const span = document.createElement('span');
    span.textContent = dividerText;

    divider.append(span);

    return divider;
}

export default function decorate(block) {
    const config = getConfig(block);

    const card = document.createElement('div');
    card.className = 'signin-card-inner';

    const icon = createIcon(config.icon, config['icon-alt']);
    const description = createDescription(config.description);

    const actions = document.createElement('div');
    actions.className = 'signin-card-actions';

    const primaryButton = createButton(
        config['primary-cta'],
        config['primary-url'],
        'signin-card-btn-primary',
        getCellText(config['primary-cta']),
    );

    const secondaryButton = createButton(
        config['secondary-cta'],
        config['secondary-url'],
        'signin-card-btn-secondary',
        getCellText(config['secondary-cta']),
    );

    const divider = createDivider(config['divider-text']);

    const guestButton = createButton(
        config['guest-cta'],
        config['guest-url'],
        'signin-card-btn-secondary signin-card-btn-guest',
        getCellText(config['guest-cta']),
    );

    if (primaryButton) actions.append(primaryButton);
    if (secondaryButton) actions.append(secondaryButton);
    if (guestButton) {
        actions.append(divider);
        actions.append(guestButton);
    }

    card.append(icon);
    card.append(description);
    card.append(actions);

    block.textContent = '';
    block.append(card);
}