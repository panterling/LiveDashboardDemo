#!/bin/sh

## Non-Browser JavaScript testing
cd Dashboard;
mocha static/js/test/test.test.js --compilers js:babel-core/register
cd ../;

## Browser-specific testing
karma start Dashboard/config/karma.conf.js --single-run;

## Build javascript package
webpack --config Dashboard/config/webpack.config.js --context Dashboard;