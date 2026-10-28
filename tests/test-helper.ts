import EmberApp from 'ember-strict-application-resolver';
import EmberRouter from '@ember/routing/router';
import * as QUnit from 'qunit';
import { registerDeprecationHandler } from '@ember/debug';
import { setApplication } from '@ember/test-helpers';
import { setup } from 'qunit-dom';
import { start as qunitStart, setupEmberOnerrorValidation } from 'ember-qunit';
import { setTesting } from '@embroider/macros';

import { installParachute } from '#src/index.ts';

class Router extends EmberRouter {
  location = 'none';
  rootURL = '/';
}

class TestApp extends EmberApp {
  modules = {
    './router': Router,
  };
}

Router.map(function () {});

// The tests of what ember-parachute 1.x did (a Mixin, Ember's events), and
// ember-qunit's own check of Ember.onerror: the only ones allowed to hit a
// deprecation
const DEPRECATED = /\(Mixin\)|\[deprecated\]|^ember-qunit/;

let deprecations: string[] = [];

registerDeprecationHandler((message, options) => {
  deprecations.push(`${options?.id}: ${message}`);
});

QUnit.hooks.beforeEach(() => {
  deprecations = [];
});

QUnit.hooks.afterEach(function (assert) {
  const { testName, module } = QUnit.config.current as {
    testName: string;
    module: { name: string };
  };

  if (!DEPRECATED.test(`${module.name}: ${testName}`)) {
    assert.deepEqual(deprecations, [], 'no deprecations, all of them enabled');
  }
});

export function start() {
  setTesting(true);
  // as an app does, before any route is made
  installParachute();
  setApplication(
    TestApp.create({
      autoboot: false,
      rootElement: '#ember-testing',
    }),
  );
  setup(QUnit.assert);
  setupEmberOnerrorValidation();
  // testem prints objects as [object Object]: a failed deepEqual's sides as
  // JSON, in the browser log
  QUnit.log((details) => {
    if (!details.result && typeof details.actual === 'object') {
      console.log(
        JSON.stringify({ actual: details.actual, expected: details.expected }),
      );
    }
  });
  qunitStart();
}
