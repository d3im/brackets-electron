/* eslint-env node */

"use strict";

const _ = require('lodash');
const gulp = require('gulp');
const path = require('path');
const watch = require('gulp-watch');

const BASE_DIRS = ['app', 'src', 'samples'];
const DIST_DIRS = ['dist', 'dist/www', 'dist/samples'];

const BASE_TESTS_DIRS = ['test'];
const DIST_TESTS_DIRS = ['dist/test'];

function copyJs(filePath, srcDir, distDir) {
    const relative = path.relative(path.join(__dirname, srcDir), filePath);
    const from = path.join(srcDir, relative);
    const to = path.dirname(path.join(distDir, relative));
    return gulp.src(from)
        .pipe(gulp.dest(to));
}

gulp.task('copy-src-dist', (_cb) => {
    const cb = _.after(BASE_DIRS.length, _cb);
    BASE_DIRS.forEach((srcDir, idx) => {
        gulp.src(`${srcDir}/**/!(*.ts|*.tsx)`)
            .pipe(gulp.dest(DIST_DIRS[idx]))
            .on('end', cb);
    });
});

gulp.task('copy-test-dist', (_cb) => {
    const cb = _.after(BASE_TESTS_DIRS.length, _cb);
    BASE_TESTS_DIRS.forEach((srcDir, idx) => {
        gulp.src(`${srcDir}/**/!(*.ts|*.tsx)`)
            .pipe(gulp.dest(DIST_TESTS_DIRS[idx]))
            .on('end', cb);
    });
});

gulp.task('watch', ['copy-src-dist', 'copy-test-dist'], () => {
    const BASE_WATCH_DIRS = BASE_DIRS.concat(BASE_TESTS_DIRS);
    const DIST_WATCH_DIRS = DIST_DIRS.concat(DIST_TESTS_DIRS);
    BASE_WATCH_DIRS.forEach((srcDir, idx) => {
        watch(`${srcDir}/**/!(*.ts|*.tsx)`, file => {
            copyJs(file.path, srcDir, DIST_WATCH_DIRS[idx]);
            console.log(`copied modified ${file.path} from ${srcDir} to ${DIST_WATCH_DIRS[idx]}`);
        });
    });
});
