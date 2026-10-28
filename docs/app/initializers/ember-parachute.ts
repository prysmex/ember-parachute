import { installParachute } from 'prysmex-ember-parachute';

// As the README says: once, before the first route is made
export function initialize() {
  installParachute();
}

export default { initialize };
