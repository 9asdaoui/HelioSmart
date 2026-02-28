// const dotenvExpand = require('dotenv-expand');
// dotenvExpand(require('dotenv').config({ path: '../../.env'/*, debug: true*/}));

// const mix = require('laravel-mix');
// require('laravel-mix-merge-manifest');

// mix.setPublicPath('../../public').mergeManifest();

// mix.js(__dirname + '/Resources/assets/js/app.js', 'js/coupon.js')
//     .sass( __dirname + '/Resources/assets/sass/app.scss', 'css/coupon.css');

// if (mix.inProduction()) {
//     mix.version();
// }


// If you're not using external JS/CSS files, you can leave this empty
// or just keep the basic setup for other potential assets

const dotenvExpand = require('dotenv-expand');
dotenvExpand(require('dotenv').config({path: '../../.env'}));

const mix = require('laravel-mix');
require('laravel-mix-merge-manifest');

mix.setPublicPath('../../public').mergeManifest();

// Remove the js/sass compilation if you're adding the code directly in Blade templates

if (mix.inProduction()) {
    mix.version();
}