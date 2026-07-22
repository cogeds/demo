function getCellValue(cell) {
    if (!cell) return '';

    const link = cell.querySelector('a');

    if (link && link.href) {
        return link.href.trim();
    }

    return cell.textContent.trim();
}

function getConfig(block) {
    const config = {};

    Array.from(block.children).forEach((row) => {
        const cells = Array.from(row.children);

        if (cells.length < 2) return;

        const key = getCellValue(cells[0]).toLowerCase().trim();
        const value = getCellValue(cells[1]).trim();

        if (key) {
            config[key] = value;
        }
    });

    return config;
}

function parseList(value) {
    if (!value) return [];

    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseModelOptions(value) {
    if (!value) return [];

    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
            const parts = item.split('=');
            const optionValue = parts[0] ? parts[0].trim() : '';
            const optionLabel = parts[1] ? parts[1].trim() : optionValue;

            return {
                value: optionValue,
                label: optionLabel,
            };
        })
        .filter((item) => item.value && item.label);
}

function getModelsByYear(config) {
    const modelsByYear = {};
    const fallbackModels = parseModelOptions(config.models);

    Object.keys(config).forEach((key) => {
        if (!key.startsWith('models ')) return;

        const year = key.replace('models ', '').trim();

        if (year) {
            modelsByYear[year] = parseModelOptions(config[key]);
        }
    });

    return {
        modelsByYear,
        fallbackModels,
    };
}

function createOption(value, label, selected = false, disabled = false) {
    const option = document.createElement('option');

    option.value = value;
    option.textContent = label;

    if (selected) {
        option.selected = true;
    }

    if (disabled) {
        option.disabled = true;
    }

    return option;
}

function populateYearSelect(select, years) {
    select.innerHTML = '';
    select.append(createOption('', 'Year', true, true));

    years.forEach((year) => {
        select.append(createOption(year, year));
    });
}

function populateModelSelect(select, models, isDisabled = false) {
    select.innerHTML = '';
    select.append(createOption('', 'Model', true, true));

    models.forEach((model) => {
        select.append(createOption(model.value, model.label));
    });

    select.disabled = isDisabled;
}

function createSearchIcon() {
    return `
    <svg class="select-vehicle-v1-search-icon" width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2.70697 14.832L6.36297 11.176C7.30097 11.823 8.39097 12.156 9.48497 12.156C10.897 12.156 12.308 11.617 13.385 10.541C15.539 8.387 15.539 4.895 13.385 2.741C12.308 1.664 10.896 1.125 9.48397 1.125C8.07297 1.125 6.66097 1.664 5.58397 2.74C3.67297 4.652 3.46697 7.613 4.94897 9.762L1.29297 13.418L2.70697 14.832ZM6.99897 4.155C7.66297 3.491 8.54597 3.125 9.48397 3.125C10.423 3.125 11.306 3.491 11.97 4.155C13.341 5.526 13.341 7.756 11.97 9.127C11.306 9.791 10.423 10.157 9.48397 10.157C8.54497 10.157 7.66197 9.791 6.99797 9.127C5.62797 7.756 5.62797 5.525 6.99897 4.155Z" fill="currentColor"></path>
    </svg>
  `;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function buildSubmitUrl(baseUrl, year, model) {
    if (!baseUrl || baseUrl === '#') {
        return '#';
    }

    let finalUrl = baseUrl
        .replaceAll('{year}', encodeURIComponent(year))
        .replaceAll('{model}', encodeURIComponent(model));

    if (!baseUrl.includes('{year}') && !baseUrl.includes('{model}')) {
        const separator = finalUrl.includes('?') ? '&' : '?';
        finalUrl = `${finalUrl}${separator}year=${encodeURIComponent(year)}&model=${encodeURIComponent(model)}`;
    }

    return finalUrl;
}

function setInvalid(select, isInvalid) {
    select.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');

    const field = select.closest('.select-vehicle-v1-field');

    if (field) {
        field.classList.toggle('is-invalid', isInvalid);
    }
}

function updateSubmitState(yearSelect, modelSelect, submitButton) {
    const hasYear = Boolean(yearSelect.value);
    const hasModel = Boolean(modelSelect.value);
    const isReady = hasYear && hasModel;

    submitButton.disabled = !isReady;
    submitButton.classList.toggle('is-enabled', isReady);
}

export default function decorate(block) {
    const config = getConfig(block);

    const years = parseList(config['year options']);
    const { modelsByYear, fallbackModels } = getModelsByYear(config);

    const buttonText = config['button text'] || 'Search';
    const submitUrl = config['submit url'] || '#';

    const signInTextBefore = config['sign in text before'] || 'Or';
    const signInLabel = config['sign in label'] || 'Sign In to My Toyota';
    const signInUrl = config['sign in url'] || '/owners/login';
    const signInTextAfter = config['sign in text after'] || 'to access your vehicles';

    const uniqueId = `select-vehicle-v1-${Math.random().toString(36).slice(2, 8)}`;
    const yearId = `${uniqueId}-year`;
    const modelId = `${uniqueId}-model`;

    block.innerHTML = `
    <form class="select-vehicle-v1-form" novalidate>
      <div class="select-vehicle-v1-form-body">
        <div class="select-vehicle-v1-field select-vehicle-v1-field-year">
          <label class="select-vehicle-v1-label" for="${yearId}">
            Year
            <span class="select-vehicle-v1-required">*</span>
          </label>

          <div class="select-vehicle-v1-select-wrap">
            <select id="${yearId}" name="year" required aria-label="Year"></select>
          </div>
        </div>

        <div class="select-vehicle-v1-field select-vehicle-v1-field-model">
          <label class="select-vehicle-v1-label" for="${modelId}">
            Model
            <span class="select-vehicle-v1-required">*</span>
          </label>

          <div class="select-vehicle-v1-select-wrap">
            <select id="${modelId}" name="model" required aria-label="Model" disabled></select>
          </div>
        </div>

        <button class="select-vehicle-v1-submit" type="submit" disabled>
          ${createSearchIcon()}
          <span>${escapeHtml(buttonText)}</span>
        </button>
      </div>

      <div class="select-vehicle-v1-footer">
        <span>${escapeHtml(signInTextBefore)}</span>
        ">${escapeHtml(signInLabel)}</a>
        <span>${escapeHtml(signInTextAfter)}</span>
      </div>
    </form>
  `;

    const form = block.querySelector('.select-vehicle-v1-form');
    const yearSelect = block.querySelector(`#${yearId}`);
    const modelSelect = block.querySelector(`#${modelId}`);
    const submitButton = block.querySelector('.select-vehicle-v1-submit');

    populateYearSelect(yearSelect, years);
    populateModelSelect(modelSelect, [], true);
    updateSubmitState(yearSelect, modelSelect, submitButton);

    yearSelect.addEventListener('change', () => {
        const selectedYear = yearSelect.value;
        const models = modelsByYear[selectedYear] || fallbackModels || [];

        setInvalid(yearSelect, false);
        setInvalid(modelSelect, false);

        if (selectedYear && models.length) {
            populateModelSelect(modelSelect, models, false);
        } else {
            populateModelSelect(modelSelect, [], true);
        }

        updateSubmitState(yearSelect, modelSelect, submitButton);
    });

    modelSelect.addEventListener('change', () => {
        setInvalid(modelSelect, false);
        updateSubmitState(yearSelect, modelSelect, submitButton);
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const selectedYear = yearSelect.value;
        const selectedModel = modelSelect.value;

        const isYearInvalid = !selectedYear;
        const isModelInvalid = !selectedModel;

        setInvalid(yearSelect, isYearInvalid);
        setInvalid(modelSelect, isModelInvalid);

        updateSubmitState(yearSelect, modelSelect, submitButton);

        if (isYearInvalid || isModelInvalid) {
            return;
        }

        const finalUrl = buildSubmitUrl(submitUrl, selectedYear, selectedModel);

        if (finalUrl && finalUrl !== '#') {
            window.location.href = finalUrl;
        }
    });
}