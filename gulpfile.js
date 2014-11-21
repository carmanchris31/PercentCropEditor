// Initialize plugins
var gulp = require('gulp'),
    sass = require('gulp-ruby-sass'),
    autoprefixer = require('gulp-autoprefixer'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    livereload = require('gulp-livereload')
    ;

// Compile SASS
gulp.task('cropeditor-sass', function() {
  return gulp.src('src/scss/cropeditor.scss')
    .pipe(sass({ style: 'compressed' }))
    .pipe(autoprefixer({
      browsers: ['last 2 versions']
      }))
    .pipe(rename({
      extname:'.min.css'}
      ))
    .pipe(gulp.dest('dist/assets/css'))
    .pipe(livereload())
    ;
});
gulp.watch('src/scss/cropeditor.scss', ['cropeditor-sass']);

// Minify JS
gulp.task('cropeditor-js', function() {
  return gulp.src('src/js/cropeditor.js')
    // .pipe(uglify())
    .pipe(rename({
      extname:'.min.js'}
      ))
    .pipe(gulp.dest('dist/assets/js'))
    .pipe(livereload())
    ;
});
gulp.watch('src/js/cropeditor.js', ['cropeditor-js']);

// LiveReload page when modifying index.html
gulp.task('cropeditor-reload', function() {
  livereload.changed();
});
gulp.watch('dist/index.html', ['cropeditor-reload']);

// Do all the above by default
gulp.task('default', ['cropeditor-sass','cropeditor-js']);
