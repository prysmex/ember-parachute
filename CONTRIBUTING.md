# How To Contribute

## Installation

```sh
git clone https://github.com/prysmex/ember-parachute.git
cd ember-parachute
pnpm install
```

The repository is the addon itself, at the root, and its site in `docs/` (a pnpm workspace package).

## Linting

```sh
pnpm lint       # eslint, prettier, template-lint, types
pnpm lint:fix
```

## Running tests

```sh
pnpm test       # builds the tests with Vite and runs them in Chrome
pnpm start      # the tests in a browser, rebuilt as you edit
```

The suite runs with every Ember deprecation enabled (`tests/index.html`): a test that hits one fails, unless it is about 1.x's deprecated paths. `tests/acceptance/ember-contract-test.ts` pins what ember-parachute needs from Ember, on Ember alone.

Against other Ember versions (the scenarios in `.try.mjs`; CI runs them all):

```sh
pnpm dlx @embroider/try apply ember-lts-6.12
pnpm install --no-lockfile
pnpm test
```

## The site

```sh
pnpm start:docs   # builds the addon, then serves docs/ with Vite
pnpm build:docs
```

Guides are Markdown in `docs/guides/`, compiled by Docfy; the live examples are routes of the docs app (`docs/app/routes`, `controllers`, `templates/examples`).
