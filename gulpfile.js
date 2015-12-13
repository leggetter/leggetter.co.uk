var gulp = require('gulp');
var gulpsync = require('gulp-sync')(gulp);
var run = require('gulp-run');
var ghPages = require('gulp-gh-pages');

gulp.task('copy-images', function() {
  return gulp.src('./_includes/realtime-web-technologies-guide/images/**/*')
    .pipe(gulp.dest('./_site/real-time-web-technologies-guide/images'));
});

gulp.task('build', function() {
  return run('jekyll build').exec();
});

gulp.task('gh-pages', function() {
  return gulp.src('./_site/**/*')
    .pipe(ghPages());  
});

// Main tasks

gulp.task('deploy', gulpsync.sync(
  [
    'build',
    'copy-images',
    'gh-pages'
  ]
));

gulp.task('default', gulpsync.sync(
  [
    'build',
    'copy-images'
  ]
));
