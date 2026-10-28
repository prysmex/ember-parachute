// A fake catalog and a fake API, for the search examples

export const SORTS = ['name', 'price', 'rating'] as const;
export type Sort = (typeof SORTS)[number];

export const TAGS = ['pumps', 'valves', 'sensors', 'spare-parts'] as const;

export interface Product {
  id: number;
  name: string;
  price: number;
  rating: number;
  tags: string[];
}

export interface Page {
  items: Product[];
  total: number;
  pages: number;
}

export interface SearchValues {
  search: string;
  page: number;
  sort: Sort;
  tags: string[];
}

const NAMES = [
  'Centrifugal pump',
  'Ball valve',
  'Pressure sensor',
  'Gate valve',
  'Diaphragm pump',
  'Flow sensor',
  'Check valve',
  'Gear pump',
  'Level sensor',
  'Butterfly valve',
  'Seal kit',
  'Impeller',
  'Temperature sensor',
  'Piston pump',
  'Relief valve',
  'Gasket set',
  'Vibration sensor',
  'Screw pump',
  'Needle valve',
  'Bearing kit',
];

const TAG_OF: Record<string, string> = {
  pump: 'pumps',
  valve: 'valves',
  sensor: 'sensors',
};

export const PRODUCTS: Product[] = NAMES.map((name, index) => ({
  id: index + 1,
  name,
  price: 40 + ((index * 37) % 260),
  rating: 1 + ((index * 7) % 5),
  tags: [
    Object.entries(TAG_OF).find(([word]) =>
      name.toLowerCase().includes(word),
    )?.[1] ?? 'spare-parts',
  ],
}));

export const PER_PAGE = 5;

/** As an API would answer, a little later. */
export async function fetchProducts({
  search,
  page,
  sort,
  tags,
}: SearchValues): Promise<Page> {
  await new Promise((resolve) => setTimeout(resolve, 350));

  const matching = PRODUCTS.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) &&
      (tags.length === 0 || tags.some((tag) => product.tags.includes(tag))),
  ).sort((a, b) =>
    sort === 'name' ? a.name.localeCompare(b.name) : b[sort] - a[sort],
  );

  return {
    items: matching.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    total: matching.length,
    pages: Math.max(1, Math.ceil(matching.length / PER_PAGE)),
  };
}

/** What both search examples' templates need from their controller. */
export interface ProductSearchControls extends SearchValues {
  dense: boolean;
  results?: Page;
  loading: boolean;
  setSearch(event: Event): void;
  setSort(event: Event): void;
  toggleTag(tag: string): void;
  goTo(page: number): void;
  toggleDense(): void;
  resetAll(): void;
}
