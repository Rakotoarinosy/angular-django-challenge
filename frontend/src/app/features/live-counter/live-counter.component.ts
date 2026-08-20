import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';

/**
 * CONTRE-EXEMPLE VOLONTAIRE — un cas où RxJS serait sur-ingénierie.
 *
 * Avec RxJS, ce compteur demanderait : un interval(), un takeUntilDestroyed(),
 * un | async dans le template, et la gestion du unwrap de la valeur.
 *
 * Avec Signals : un `setInterval` classique, un `update()`, et c'est fini.
 * DestroyRef.onDestroy() remplace le takeUntilDestroyed() pour le nettoyage —
 * pas besoin d'observable pour une simple incrémentation locale.
 *
 * Règle pratique retenue pour le projet :
 * → Signal par défaut pour l'état local synchrone.
 * → RxJS dès qu'il y a une notion de FLUX, d'ANNULATION ou de COMBINAISON
 *   de plusieurs sources asynchrones (recherche, WebSocket, polling HTTP).
 */
@Component({
  selector: 'app-live-counter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>Compteur : {{ count() }}</p>
    <p>Parité : {{ parity() }}</p>
    <button type="button" (click)="reset()">Réinitialiser</button>
  `,
})
export class LiveCounterComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly count = signal(0);
  readonly parity = computed(() => (this.count() % 2 === 0 ? 'pair' : 'impair'));

  constructor() {
    const intervalId = setInterval(() => this.count.update((v) => v + 1), 1000);
    this.destroyRef.onDestroy(() => clearInterval(intervalId));
  }

  reset(): void {
    this.count.set(0);
  }
}
