import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LiveCounterComponent } from './live-counter.component';

/**
 * Pas de fakeAsync()/tick() ici : l'app est zoneless, zone.js n'est pas
 * chargé. On utilise les fake timers natifs de Vitest, qui patchent
 * directement setInterval/setTimeout globaux — exactement ce dont notre
 * composant (et RxJS dans product-search.service) ont besoin.
 */
describe('LiveCounterComponent', () => {
  let fixture: ComponentFixture<LiveCounterComponent>;
  let component: LiveCounterComponent;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ imports: [LiveCounterComponent] });
    fixture = TestBed.createComponent(LiveCounterComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy(); // déclenche DestroyRef.onDestroy() → clearInterval
    vi.useRealTimers();
  });

  it('incrémente le signal chaque seconde, sans souscription à gérer manuellement', () => {
    fixture.detectChanges();
    expect(component.count()).toBe(0);

    vi.advanceTimersByTime(1000);
    expect(component.count()).toBe(1);

    vi.advanceTimersByTime(3000);
    expect(component.count()).toBe(4);
  });

  it('calcule la parité de façon dérivée via computed()', () => {
    fixture.detectChanges();
    vi.advanceTimersByTime(1000);
    expect(component.parity()).toBe('impair');

    vi.advanceTimersByTime(1000);
    expect(component.parity()).toBe('pair');
  });

  it('reset() remet le compteur à zéro de façon synchrone', () => {
    fixture.detectChanges();
    vi.advanceTimersByTime(3000);
    expect(component.count()).toBe(3);

    component.reset();
    expect(component.count()).toBe(0); // pas d'attente, pas d'async pipe
  });
});
