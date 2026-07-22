function getYoutubeId(url) {
    if (!url) return '';

    try {
        const parsed = new URL(url);

        if (parsed.hostname.includes('youtu.be')) {
            return parsed.pathname.replace('/', '').split('/')[0];
        }

        if (parsed.hostname.includes('youtube.com')) {
            if (parsed.pathname.includes('/embed/')) {
                return parsed.pathname.split('/embed/')[1]?.split('/')[0] || '';
            }

            if (parsed.pathname.includes('/shorts/')) {
                return parsed.pathname.split('/shorts/')[1]?.split('/')[0] || '';
            }

            return parsed.searchParams.get('v') || '';
        }
    } catch (error) {
        return '';
    }

    return '';
}

function getCleanUrl(value) {
    if (!value) return '';

    const trimmedValue = value.trim();

    try {
        return new URL(trimmedValue).href;
    } catch (error) {
        return trimmedValue;
    }
}

function getCellValue(cell) {
    if (!cell) return '';

    const link = cell.querySelector('a');

    if (link && link.href) {
        return getCleanUrl(link.href);
    }

    const img = cell.querySelector('img');

    if (img && img.src) {
        return getCleanUrl(img.src);
    }

    return cell.textContent.trim();
}

function getRowValue(row) {
    if (!row) return '';

    const cells = Array.from(row.children);

    if (cells.length > 1) {
        return getCellValue(cells[1]);
    }

    return getCellValue(cells[0] || row);
}

function createPlayIcon() {
    return `
    <svg class="hero-video-v1-play-icon" viewBox="0 0 92 91" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g fill="#fff" fill-rule="evenodd">
        <path d="M46 90.242C21.168 90.242.944 70.018.944 45.186.944 20.354 21.168.13 46 .13c24.832 0 45.056 20.224 45.056 45.056 0 24.832-20.224 45.056-45.056 45.056zm0-86.016c-22.58 0-40.96 18.38-40.96 40.96 0 22.58 18.38 40.96 40.96 40.96 22.58 0 40.96-18.38 40.96-40.96 0-22.58-18.38-40.96-40.96-40.96z" fill-rule="nonzero"></path>
        <path d="M66.48 45.186 33.712 61.57V28.802z"></path>
      </g>
    </svg>
  `;
}

function escapeAttribute(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

export default function decorate(block) {
    const rows = Array.from(block.children);

    const videoUrl = getRowValue(rows[0]);
    const poster = getRowValue(rows[1]);
    const title = getRowValue(rows[2]) || 'Video Player';

    const videoId = getYoutubeId(videoUrl);

    if (!videoUrl || !videoId) {
        block.innerHTML = '';
        block.classList.add('hero-video-v1-error');
        console.warn('Hero Video: Invalid or missing YouTube URL', videoUrl);
        return;
    }

    if (!poster) {
        block.innerHTML = '';
        block.classList.add('hero-video-v1-error');
        console.warn('Hero Video: Missing poster image');
        return;
    }

    const safePoster = escapeAttribute(poster);
    const safeTitle = escapeAttribute(title);

    block.innerHTML = `
    <div class="hero-video-v1-inner">
      <div class="hero-video-v1-poster" style="background-image: url('${safePoster}')">
        <button class="hero-video-v1-play" type="button" aria-label="Play video">
          ${createPlayIcon()}
        </button>
      </div>

      <div class="hero-video-v1-player" aria-hidden="true"></div>
    </div>
  `;

    const posterEl = block.querySelector('.hero-video-v1-poster');
    const playBtn = block.querySelector('.hero-video-v1-play');
    const player = block.querySelector('.hero-video-v1-player');

    playBtn.addEventListener('click', () => {
        const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&modestbranding=1&rel=0`;

        player.innerHTML = `
      ${embedUrl}
      </iframe>
    `;

        posterEl.classList.add('is-hidden');
        player.classList.add('is-active');
        player.setAttribute('aria-hidden', 'false');
    });
}