function getYoutubeId(url) {
    try {
        const parsed = new URL(url);

        if (parsed.hostname.includes('youtu.be')) {
            return parsed.pathname.replace('/', '');
        }

        if (parsed.hostname.includes('youtube.com')) {
            return parsed.searchParams.get('v');
        }
    } catch (e) {
        return '';
    }

    return '';
}

export default function decorate(block) {
    const rows = [...block.children];

    const videoUrl = rows[0]?.textContent.trim();
    const poster =
        rows[1]?.querySelector('img')?.src
        || rows[1]?.textContent.trim();

    const videoId = getYoutubeId(videoUrl);

    block.innerHTML = `
    <div class="herovideo-wrapper">
      <div class="herovideo-poster">
        <img src="${poster}" alt="Video Poster" loading="eager">

        <button
          class="herovideo-play"
          aria-label="Play Video"
          type="button">
          <span></span>
        </button>
      </div>

      <div class="herovideo-player"></div>
    </div>
  `;

    const playBtn = block.querySelector('.herovideo-play');
    const posterWrap = block.querySelector('.herovideo-poster');
    const player = block.querySelector('.herovideo-player');

    playBtn?.addEventListener('click', () => {
        posterWrap.classList.add('hidden');

        player.innerHTML = `
      <iframe
        src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1"
        title="Video Player"
        loading="eager"
        allow