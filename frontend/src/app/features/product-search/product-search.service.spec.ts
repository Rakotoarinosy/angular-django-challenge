import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProductSearchService, SearchState } from './product-search.service';
import { Product } from '../../core/models/product.model';

const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Clavier mécanique', category: 'electronics', price: 89, inStock: true },
];

/**
 * vi.useFakeTimers() patche setTimeout/setInterval au niveau global — c'est
 * exactement le mécanisme que RxJS (asyncScheduler, utilisé par debounceTime
 * et retry({delay})) utilise en interne. Pas besoin de zone.js ni de
 * fakeAsync()/tick() côté Angular.
 */
describe('ProductSearchService', () => {
  let service: ProductSearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductSearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.useRealTimers();
  });

  it('ne déclenche aucune requête tant que le debounce (300ms) n\'est pas écoulé', () => {
    const emitted: SearchState[] = [];
    service.state$.subscribe((state) => emitted.push(state));

    service.search('clav');
    vi.advanceTimersByTime(100);
    httpMock.expectNone((r) => r.url === '/api/products');

    vi.advanceTimersByTime(250); // total 350ms > 300ms debounce
    const req = httpMock.expectOne((r) => r.url === '/api/products');
    req.flush(MOCK_PRODUCTS);

    expect(emitted.at(-1)?.results).toEqual(MOCK_PRODUCTS);
  });

  it('annule la requête précédente si une nouvelle recherche arrive avant la réponse (switchMap)', () => {
    const emitted: SearchState[] = [];
    service.state$.subscribe((state) => emitted.push(state));

    service.search('cla');
    vi.advanceTimersByTime(300);
    const firstReq = httpMock.expectOne((r) => r.url === '/api/products');

    // Nouvelle frappe avant que la première requête ne réponde
    service.search('clavier');
    vi.advanceTimersByTime(300);

    // switchMap s'est déjà désabonné de la première requête à ce stade :
    // Angular la marque "cancelled" — c'est précisément ce qu'on veut prouver.
    expect(firstReq.cancelled).toBe(true);

    const secondReq = httpMock.expectOne((r) => r.url === '/api/products');
    secondReq.flush(MOCK_PRODUCTS);

    expect(emitted.at(-1)?.results).toEqual(MOCK_PRODUCTS);
  });

  it('ne relance pas de requête si le terme est identique au précédent (distinctUntilChanged)', () => {
    const emitted: SearchState[] = [];
    service.state$.subscribe((state) => emitted.push(state)); // sans ça, le pipe ne tourne jamais

    service.search('clavier');
    vi.advanceTimersByTime(300);
    httpMock.expectOne((r) => r.url === '/api/products').flush(MOCK_PRODUCTS);

    service.search('clavier'); // même terme
    vi.advanceTimersByTime(300);
    httpMock.expectNone((r) => r.url === '/api/products');

    expect(emitted.at(-1)?.results).toEqual(MOCK_PRODUCTS);
  });

  it('dégrade proprement en cas d\'erreur réseau (catchError)', () => {
    const emitted: SearchState[] = [];
    service.state$.subscribe((state) => emitted.push(state));

    service.search('clavier');
    vi.advanceTimersByTime(300);

    // 1 requête initiale + 2 retries = 3 appels avant l'échec définitif
    for (let i = 0; i < 3; i++) {
      httpMock.expectOne((r) => r.url === '/api/products').flush('erreur', {
        status: 500,
        statusText: 'Server Error',
      });
      vi.advanceTimersByTime(500);
    }

    const finalState = emitted.at(-1);
    expect(finalState?.error).toBeTruthy();
    expect(finalState?.results).toEqual([]);
  });
});
