// @noflow
const path = require('path');

const { customLaunchers } = require('./launchers.js');

module.exports = {
  // base path that will be used to resolve all patterns (eg. files, exclude)
  basePath: path.resolve(__dirname, '..', '..', 'packages'),

  // frameworks to use
  // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
  frameworks: ['mocha'],

  // options for the mocha client
  client: {
    mocha: {
      timeout: 10000,
    },
  },

  // list of files / patterns to load in the browser
  files: [
    { pattern: '**/__tests__/index.js', watched: true, included: true, served: true, nocache: false },
  ],

  // list of files to exclude
  exclude: ['**/*.swp'],

  // preprocess matching files before serving them to the browser
  // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
  preprocessors: {
    '**/__tests__/index.js': ['webpack', 'sourcemap'],
  },

  // test results reporter to use
  // possible values: 'dots', 'progress'
  // available reporters: https://npmjs.org/browse/keyword/karma-reporter
  reporters: ['mocha', 'BrowserStack'],

  mochaReporter: {
    output: 'full',
    showDiff: 'unified',
  },

  reportSlowerThan: 200,

  // web server port
  port: 9876,

  // enable / disable colors in the output (reporters and logs)
  colors: true,

  // start these browsers
  // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
  browsers: ['ChromiumHeadless'],

  browserNoActivityTimeout: 60000,
  browserDisconnectTimeout: 20000,

  // Concurrency level
  // how many browser should be started simultaneous
  concurrency: Infinity,

  customLaunchers,

  browserStack: {
    project: 'sdk-js',
    timeout: 1800,
    build: process.env.GITHUB_SHA,
  },

  hostname: 'bs-local.com',
};
