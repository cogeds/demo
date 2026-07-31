const { src, dest, watch, series } = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const sourcemaps = require('gulp-sourcemaps');
const plumber = require('gulp-plumber');
const browserSync = require('browser-sync').create();

// Compile each component SCSS (exclude partials starting with _) and output CSS next to the SCSS
function styles() {
  return src('blocks/**/[^_]*.scss', { base: 'blocks', sourcemaps: true })
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sass({ outputStyle: 'expanded' }).on('error', sass.logError))
    .pipe(sourcemaps.write('.')) // writes .map file next to .css
    .pipe(dest('blocks')) // preserves folder structure because base is 'blocks'
    .pipe(browserSync.stream({ match: '**/*.css' })); // inject CSS into browser
}

function serve() {
  // If you run `aem up` and it serves on http://localhost:3000 use proxy. Otherwise set BS_PROXY env to something else.
  const proxyTarget = process.env.BS_PROXY || 'http://localhost:3000';

  // If you don't want to proxy (serve static files), comment proxy and use server option:
  // browserSync.init({ server: { baseDir: './' }, open: false, notify: false });

  browserSync.init({
    proxy: proxyTarget,
    open: false,
    notify: false,
  });

  // Watch SCSS (including partials). When partials change we still run the styles task so dependent CSS updates.
  watch('blocks/**/*.scss', styles);

  // Watch other files (html, markup, etc.) and reload full page on changes
  watch(['blocks/**/*.html', '*.html', 'index.html']).on('change', browserSync.reload);
}

exports.styles = styles;
exports.serve = series(styles, serve);
exports.watch = exports.serve;
exports.default = exports.serve;
