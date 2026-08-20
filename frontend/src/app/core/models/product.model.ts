/**
 * Modèle de domaine — indépendant de tout détail technique (HTTP, RxJS, Signals).
 * Clean Code : "les politiques ne dépendent pas des détails."
 */
export interface Product {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly price: number;
  readonly inStock: boolean;
}

export interface SearchFilters {
  readonly term: string;
  readonly category: string | null;
}

export const EMPTY_FILTERS: SearchFilters = {
  term: '',
  category: null,
};
