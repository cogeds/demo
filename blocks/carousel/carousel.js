import { fetchPlaceholders } from '../../scripts/placeholders.js';

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  // clones carry the same slide-index as the real slide they duplicate
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-slide');

  // mark the actually-centered element (real or clone) as visible, hide the rest
  slides.forEach((aSlide) => {
    const isActive = aSlide === slide;
    aSlide.setAttribute('aria-hidden', !isActive);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (!isActive) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator, idx) => {
    const button = indicator.querySelector('button');
    if (idx !== slideIndex) {
      button.removeAttribute('disabled');
      button.removeAttribute('aria-current');
    } else {
      button.setAttribute('disabled', true);
      button.setAttribute('aria-current', true);
    }
  });
}

/**
 * Scrolls the given slide position (DOM order, clones included) into view.
 */
function scrollToPosition(block, position, behavior = 'smooth') {
  const target = block.querySelectorAll('.carousel-slide')[position];
  if (!target) return;
  block.querySelector('.carousel-slides').scrollTo({
    top: 0,
    left: target.offsetLeft,
    behavior,
  });
}

/**
 * Runs a callback once the smooth scroll has settled (scrollend, with a
 * timeout fallback for browsers/situations where scrollend doesn't fire).
 */
function afterScroll(block, cb) {
  const slidesEl = block.querySelector('.carousel-slides');
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    cb();
  };
  slidesEl.addEventListener('scrollend', run, { once: true });
  window.setTimeout(run, 900);
}

/**
 * Advances one slide in the given direction, looping seamlessly through a
 * clone of the first slide so the motion is always continuous (no jump-back).
 * DOM order is: [real 0 … real n-1, clone-of-first]. The active index tracked
 * on the block is always the real index (0 … n-1).
 */
function advance(block, dir = 1) {
  const realCount = Number(block.dataset.realCount);
  const current = parseInt(block.dataset.activeSlide || 0, 10);

  if (dir > 0 && current === realCount - 1) {
    // glide one step onto the trailing clone, then snap back to the real first slide
    scrollToPosition(block, realCount, 'smooth');
    afterScroll(block, () => scrollToPosition(block, 0, 'instant'));
  } else if (dir < 0 && current === 0) {
    // jump onto the trailing clone (visually identical to slide 1), then glide to the last slide
    scrollToPosition(block, realCount, 'instant');
    window.setTimeout(() => scrollToPosition(block, realCount - 1, 'smooth'), 30);
  } else {
    scrollToPosition(block, current + dir, 'smooth');
  }
}

const AUTOPLAY_INTERVAL = 6000;

const ICONS = {
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15.5 4.5 8 12l7.5 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.5 4.5 16 12l-7.5 7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pause: '<svg class="carousel-icon-pause" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="6.5" y="5" width="3.5" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="3.5" height="14" rx="1" fill="currentColor"/></svg>',
  play: '<svg class="carousel-icon-play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>',
};

function stopAutoplay(block) {
  if (block.dataset.autoplayTimer) {
    clearInterval(Number(block.dataset.autoplayTimer));
    delete block.dataset.autoplayTimer;
  }
}

function startAutoplay(block) {
  // don't autoplay if the user paused it, prefers reduced motion, or the tab is hidden
  if (block.dataset.paused === 'true') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.hidden) return;
  stopAutoplay(block);
  const timer = window.setInterval(() => {
    advance(block, 1);
  }, AUTOPLAY_INTERVAL);
  block.dataset.autoplayTimer = timer;
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (!slideIndicators) return;

  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      // indicators jump directly to a real slide (no wrap needed)
      scrollToPosition(block, parseInt(slideIndicator.dataset.targetSlide, 10), 'smooth');
    });
  });

  block.querySelector('.slide-prev').addEventListener('click', () => {
    advance(block, -1);
  });
  block.querySelector('.slide-next').addEventListener('click', () => {
    advance(block, 1);
  });

  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) updateActiveSlide(entry.target);
    });
  }, { threshold: 0.5 });
  block.querySelectorAll('.carousel-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });

  // play/pause toggle
  const playPause = block.querySelector('.carousel-play-pause');
  if (playPause) {
    playPause.addEventListener('click', () => {
      const paused = block.dataset.paused === 'true';
      block.dataset.paused = (!paused).toString();
      playPause.setAttribute('aria-pressed', (!paused).toString());
      playPause.setAttribute('aria-label', paused ? playPause.dataset.pauseLabel : playPause.dataset.playLabel);
      if (paused) startAutoplay(block);
      else stopAutoplay(block);
    });
  }

  // pause on hover / keyboard focus, resume on leave
  block.addEventListener('mouseenter', () => stopAutoplay(block));
  block.addEventListener('mouseleave', () => startAutoplay(block));
  block.addEventListener('focusin', () => stopAutoplay(block));
  block.addEventListener('focusout', () => startAutoplay(block));

  // pause when tab is not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay(block);
    else startAutoplay(block);
  });

  startAutoplay(block);
}

function createSlide(row, slideIndex, carouselId) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
  slide.classList.add('carousel-slide');

  row.querySelectorAll(':scope > div').forEach((column, colIdx) => {
    column.classList.add(`carousel-slide-${colIdx === 0 ? 'image' : 'content'}`);
    slide.append(column);
  });

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) {
    slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));
  }

  return slide;
}

/**
 * Builds a decorative duplicate of a slide used for the seamless loop.
 * Keeps the original's data-slide-index (so it maps to the right indicator)
 * but strips ids/labels to avoid duplicate-id issues.
 */
function cloneSlide(slide) {
  const clone = slide.cloneNode(true);
  clone.classList.add('carousel-slide-clone');
  clone.removeAttribute('id');
  clone.removeAttribute('aria-labelledby');
  clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  clone.setAttribute('aria-hidden', 'true');
  return clone;
}

let carouselId = 0;
export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-${carouselId}`);
  const rows = block.querySelectorAll(':scope > div');
  const isSingleSlide = rows.length < 2;

  const placeholders = await fetchPlaceholders();

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', placeholders.carousel || 'Carousel');
  block.dataset.realCount = rows.length;

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');
  block.prepend(slidesWrapper);

  let slideIndicators;
  if (!isSingleSlide) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute('aria-label', placeholders.carouselSlideControls || 'Carousel Slide Controls');
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);

    const slideNavButtons = document.createElement('div');
    slideNavButtons.classList.add('carousel-navigation-buttons');
    slideNavButtons.innerHTML = `
      <button type="button" class="slide-prev" aria-label="${placeholders.previousSlide || 'Previous Slide'}">${ICONS.prev}</button>
      <button type="button" class="slide-next" aria-label="${placeholders.nextSlide || 'Next Slide'}">${ICONS.next}</button>
    `;

    container.append(slideNavButtons);

    const pauseLabel = placeholders.pauseSlideshow || 'Pause Slideshow';
    const playLabel = placeholders.playSlideshow || 'Play Slideshow';
    const playPause = document.createElement('button');
    playPause.type = 'button';
    playPause.className = 'carousel-play-pause';
    playPause.dataset.pauseLabel = pauseLabel;
    playPause.dataset.playLabel = playLabel;
    playPause.setAttribute('aria-label', pauseLabel);
    playPause.setAttribute('aria-pressed', 'false');
    playPause.innerHTML = `${ICONS.pause}${ICONS.play}`;
    slideIndicatorsNav.append(playPause);
  }

  const realSlides = [];
  rows.forEach((row, idx) => {
    const slide = createSlide(row, idx, carouselId);
    realSlides.push(slide);
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="${placeholders.showSlide || 'Show Slide'} ${idx + 1} ${placeholders.of || 'of'} ${rows.length}"></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  });

  // append a clone of the first slide so autoplay can loop continuously
  if (!isSingleSlide) {
    slidesWrapper.append(cloneSlide(realSlides[0]));
  }

  container.append(slidesWrapper);
  block.prepend(container);

  if (!isSingleSlide) {
    bindEvents(block);
    // establish the initial active slide (indicators, aria, content reveal)
    updateActiveSlide(realSlides[0]);
  }
}
