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
    } catch (e) {
        return '';
    }

    return '';
}

function getRowValue(row) {
    if (!row) return '';

    const cell = row.querySelector(':scope > div') || row;

    const link = cell.querySelector('a');
    if (link?.href) {
        return link.href.trim();
    }

    const img = cell.querySelector('img');
    if (img?.src) {
        return img.src.trim();
    }

    return cell.textContent.trim();
}

function createPlayIcon() {
    return `
    <svg class="hero-video-v1-play-icon" viewBox="0 0 92 91" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g fill="#FFF" fill-rule="evenodd">
        <path d="M46 90.242C21.168 90.242.944 70.018.944 45.186.944 20.354 21.168.13 46 .13c24.832 0 45.056 20.224 45.056 45.056 0 24.832-20.224 45.056-45.056 45.056zm0-86.016c-22.58 0-40.96 18.38-40.96 40.96 0 22.58 18.38 40.96 40.96 40.96 22.58 0 40.96-18.38 40.96-40.96 0-22.58-18.38-40.96-40.96-40.96z" fill-rule="nonzero"></path>
        <path d="M66.48 45.186 33.712 61.57V28.802z"></path>
      </g>
    </svg>
  `;
}

export default function decorate(block) {
    const rows = [...block.children];

    const videoUrl = getRowValue(rows[0]);
    const poster = getRowValue(rows[1]);
    const title = getRowValue(rows[2]) || 'Video Player';

    const videoId = getYoutubeId(videoUrl);

    if (!videoUrl || !videoId) {
        block.innerHTML = '';
        block.classList.add('hero-video-v1-error');
        // eslint-disable-next-line no-console
        console.warn('Hero Video: Invalid or missing YouTube URL', videoUrl);
        return;
    }

    if (!poster) {
        block.innerHTML = '';
        block.classList.add('hero-video-v1-error');
        // eslint-disable-next-line no-console
        console.warn('Hero Video: Missing poster image');
        return;
    }

    block.innerHTML = `
    <div class="hero-video-v1-inner">
      <div class="hero-video-v1-poster" style="background-image: url('${poster}')">
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
      <iframe
        class="hero-video-v1-iframe"
        src="${embedUrl}"
        title="${title}"
        allow="autoplay; encrypted-media; picture-in-picture"
         });
}