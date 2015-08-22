var gulp = require('gulp');
var run = require('gulp-run');
var ghPages = require('gulp-gh-pages');
var webserver = require('gulp-webserver');

function copyImages() {
  gulp.src('./_includes/realtime-web-technologies-guide/images/**/*')
    .pipe(gulp.dest('./_site/real-time-web-technologies-guide/images'));
}

gulp.task('default', ['build'], function() {
  copyImages();
  gulp.src('_site')
    .pipe(webserver({
      livereload: true,
      open: true,
      port: 8080
    }));
});

gulp.task('build', function() {
  return run('jekyll build').exec();
});

gulp.task('deploy', ['build'], function() {
  copyImages();
  return gulp.src('./_site/**/*')
    .pipe(ghPages());
});
