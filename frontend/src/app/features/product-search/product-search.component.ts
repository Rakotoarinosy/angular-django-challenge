import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductSearchService, SearchState } from './product-search.service';

const IDLE_STATE: SearchState = { results: [], loading: false, error: null };

/**
 * CAS D'USAGE RÉEL #1 — Où les Signals gagnent :
 *
 * `showFilters` et `selectedCategory` sont de l'état 100% synchrone, local
 * au composant. Pas de source asynchrone, pas d'annulation à gérer, pas de
 * désabonnement à prévoir dans ngOnDestroy. Un signal() suffit : lecture
 * directe dans le template, mise à jour directe, zéro boilerplate RxJS.
 *
 * CAS D'USAGE RÉEL #3 — Le pattern de pont :
 *
 * `searchState` est un Signal DÉRIVÉ d'un flux RxJS via toSignal(). On garde
 * toute la puissance des opérateurs RxJS dans le service (debounce, switchMap,
 * retry) tout en exposant un Signal simple, lisible en synchrone dans le
 * template — sans `| async`, sans souscription manuelle.
 *
 * Conclusion : Signals et RxJS ne sont pas concurrents, ils ont des
 * responsabilités différentes. Le choix se fait au niveau de la NATURE de
 * la donnée (synchrone/locale vs asynchrone/orchestrée), pas par préférence
 * personnelle.
 */
@Component({
  selector: 'app-product-search',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-search.component.html',
})
export class ProductSearchComponent {
  private readonly searchService = inject(ProductSearchService);

  // --- État local synchrone : Signals purs, pas de RxJS nécessaire ---
  readonly showFilters = signal(false);
  readonly selectedCategory = signal<string | null>(null);

  // --- État asynchrone : RxJS pour la logique, Signal pour la consommation ---
  readonly searchState = toSignal(this.searchService.state$, { initialValue: IDLE_STATE });

  // --- Dérivés : computed() recalcule automatiquement, sans abonnement ---
  readonly resultCount = computed(() => this.searchState().results.length);

  readonly filteredResults = computed(() => {
    const category = this.selectedCategory();
    const { results } = this.searchState();
    return category ? results.filter((p) => p.category === category) : results;
  });

  readonly hasError = computed(() => this.searchState().error !== null);

  onSearchInput(term: string): void {
    this.searchService.search(term);
  }

  toggleFilters(): void {
    this.showFilters.update((visible) => !visible);
  }

  selectCategory(category: string | null): void {
    this.selectedCategory.set(category);
  }
}
