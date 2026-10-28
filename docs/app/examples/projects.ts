// Three fake projects, for the lifecycle example
export interface Project {
  id: string;
  name: string;
  summary: string;
}

export const PROJECTS: Project[] = [
  { id: '1', name: 'North plant', summary: 'Pumps and valves, 4 lines.' },
  { id: '2', name: 'Harbor depot', summary: 'Cold storage, 2 docks.' },
  { id: '3', name: 'Ridge mine', summary: 'Conveyors and sensors.' },
];

export const TABS = ['overview', 'tasks', 'files'] as const;
export type Tab = (typeof TABS)[number];

export const VIEWS = ['cards', 'table'] as const;
export type View = (typeof VIEWS)[number];
