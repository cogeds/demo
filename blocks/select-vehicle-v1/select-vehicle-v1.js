function getCellValue(cell) {
    if (!cell) return '';

    const link = cell.querySelector('a');

    if (link && link.href) {
        return link.href.trim();
    }

    return cell.textContent.trim();
}

function getRowCells(row) {
    return Array.from(row.children);
}

function getConfig(block) {
    const config = {};

    Array.from(block.children).forEach((row) => {
        const cells = getRowCells(row);

        if (cells.length < 2) return;

        const key = getCellValue(cells[0]).toLowerCase().trim();
        const value = getCellValue(cells[1]).trim();

        if (key) {
            config[key] = value;
        }
    });

    return config;
}

function parseYearOptions(value) {
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
            const optionValue = parts[0]?.trim() || '';
            const optionLabel = parts[1]?.trim() || optionValue;

            return {
                value: optionValue,
                label: optionLabel,
            };
        })
        .filter((item) => item.value && item.label);
}

function createSearchIcon() {
    return `
    <svg class="select-vehicle-v1-search-icon" width="16" height="17" viewBox="0 0 16 17" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2.70697 14.832L6.36297 11.176C7.30097 11.823 8.39097 12.156 9.48497 12.156C10.897 12.156 12.308 11.617 13.385 10.541C15.539 8.387 15.539 4.895 13.385 2.741C12.308 1.664 10.896 1.125 9.48397 1.125C8.07297 1.125 6.66097 1.664 5.58397 2.74C3.67297 4.652 3.46697 7.613 4.94897 9.762L1.29297 13.418L2.70697 14.832ZM6.99897 4.155C7.66297 3.491 8.54597 3.125 9.48397 3.125C10.423 3.125 11.306 3.491 11.97 4.155C13.341 5.526 13.341 7.756 11.97 9.127C11.306 9.791 10.423 10.157 9.48397 10.157C8.54497 10.157 7.66197 9.791 6.99797 9.127C5.62797 7.756 5.62797 5.525 6.99897 4.155Z" fill="currentColor"></path>
    </svg>
  `;
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

function populateSelect(select, placeholder, options) {
    select.innerHTML = '';
    select.append(createOption('', placeholder, true, true));

    options.forEach((item) => {
        if (typeof item === 'string') {
            select.append(createOption(item, item));
        } else {
            select.append(createOption(item.value, item.label));
        }
    });
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

export default function decorate(block) {
    const config = getConfig(block);

    const years = parseYearOptions(config['year options']);
    const models = parseModelOptions(config.models);

    const buttonText = config['button text'] || 'Search';
    const submitUrl = config['submit url'] || '#';

    const signInTextBefore = config['sign in text before'] || 'Or';
    const signInLabel = config['sign in label'] || 'Sign In to My Toyota';
    const signInUrl = config['sign in url'] || '/owners/login';
    const signInTextAfter = config['sign in text after'] || 'to access your vehicles';

    block.innerHTML = '';

    const form = document.createElement('form');
    form.className = 'select-vehicle-v1-form';
    form.noValidate = true;

    form.innerHTML = `
    <div class="select-vehicle-v1-form-body">
      <div class="select-vehicle-v1-field select-vehicle-v1-field-year">
        <label class="select-vehicle-v1-label" for="select-vehicle-v1-year">
          Year
          <span class="select-vehicle-v1-required">*</span>
        </label>

        <div class="select-vehicle-v1-select-wrap">
          <select id="select-vehicle-v1-year" name="year" required aria-label="Year"></select>
        </div>
      </div>

      <div class="select-vehicle-v1-field select-vehicle-v1-field-model">
        <label class="select-vehicle-v1-label" for="select-vehicle-v1-model">
          Model
          <span class="select-vehicle-v1-required">*</span>
        </label>

        <div class="select-vehicle-v1-select-wrap">
          <select id="select-vehicle-v1-model" name="model" required aria-label="Model"></select>
        </div>
      </div>

      <button class="select-vehicle-v1-submit" type="submit">
        ${createSearchIcon()}
        <span>${buttonText}</span>
      </button>
    </div>

    <div class="select-vehicle-v1-footer">
      <span>${signInTextBefore}</span>
      ${signInUrl}${signInLabel}</a>
      <span>${signInTextAfter}</span>
    </div>
  `;

    block.append(form);

    const yearSelect = block.querySelector('#select-vehicle-v1-year');
    const modelSelect = block.querySelector('#select-vehicle-v1-model');

    populateSelect(yearSelect, 'Year', years);
    populateSelect(modelSelect, 'Model', models);

    yearSelect.addEventListener('change', () => {
        setInvalid(yearSelect, false);
        populateSelect(modelSelect, 'Model', models);
        setInvalid(modelSelect, false);
    });

    modelSelect.addEventListener('change', () => {
        setInvalid(modelSelect, false);
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const selectedYear = yearSelect.value;
        const selectedModel = modelSelect.value;

        const isYearInvalid = !selectedYear;
        const isModelInvalid = !selectedModel;

        setInvalid(yearSelect, isYearInvalid);
        setInvalid(modelSelect, isModelInvalid);

        if (isYearInvalid || isModelInvalid) {
            return;
        }

        const finalUrl = buildSubmitUrl(submitUrl, selectedYear, selectedModel);

        if (finalUrl && finalUrl !== '#') {
            window.location.href = finalUrl;
        }
    });
}