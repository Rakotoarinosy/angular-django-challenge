import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  Subject,
  catchError,
  concat,
  debounceTime,
  distinctUntilChanged,
  of,
  retry,
  switchMap,
} from 'rxjs';
import { Product, SearchFilters } from '../../core/models/product.model';

export interface SearchState {
  readonly results: readonly Product[];
  readonly loading: boolean;
  readonly error: string | null;
}

const INITIAL_STATE: SearchState = {
  results: [],
  loading: false,
  error: null,
};

/**
 * CAS D'USAGE RÉEL #2 — Pourquoi RxJS reste indispensable ici :
 *
 * 1. debounceTime()            → attendre que l'utilisateur arrête de taper
 * 2. distinctUntilChanged()    → ne pas relancer une requête identique
 * 3. switchMap()               → annuler automatiquement la requête précédente
 *                                si une nouvelle recherche arrive (race condition)
 * 4. retry()                   → réessayer en cas d'échec réseau transitoire
 * 5. catchError()              → dégrader proprement sans casser le flux
 *
 * Un signal seul n'a NATIVEMENT aucun de ces opérateurs : il faudrait les
 * réimplémenter à la main (timers, flags "requête en cours", compteurs de
 * version pour ignorer les réponses obsolètes...). RxJS résout ce problème
 * de façon déclarative et testable.
 */
@Injectable({ providedIn: 'root' })
export class ProductSearchService {
  private readonly http = inject(HttpClient);

  /** Point d'entrée : chaque terme tapé est poussé ici. */
  private readonly searchTerm$ = new Subject<string>();

  /** Flux de sortie unique, déjà debouncé/dédupliqué/annulable. */
  readonly state$: Observable<SearchState> = this.searchTerm$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((term) => this.executeSearch(term)),
  );

  search(term: string): void {
    this.searchTerm$.next(term.trim());
  }

  private executeSearch(term: string): Observable<SearchState> {
    if (!term) {
      return of({ ...INITIAL_STATE });
    }

    const loading$ = of<SearchState>({ results: [], loading: true, error: null });
    const request$ = this.http.get<Product[]>('/api/products', { params: { q: term } }).pipe(
      retry({ count: 2, delay: 500 }),
      switchMap((results) => of<SearchState>({ results, loading: false, error: null })),
      catchError(() =>
        of<SearchState>({
          results: [],
          loading: false,
          error: "La recherche a échoué. Réessayez dans quelques instants.",
        }),
      ),
    );

    // "loading: true" émis immédiatement, puis le résultat final —
    // un affichage réactif sans état intermédiaire géré à la main.
    return concat(loading$, request$);
  }
}
