import Route from '@ember/routing/route';

import { PROJECTS, type Project } from 'docs/examples/projects';

export default class LifecycleRoute extends Route {
  model({ id }: { id: string }): Project {
    return PROJECTS.find((project) => project.id === id) ?? PROJECTS[0]!;
  }
}
