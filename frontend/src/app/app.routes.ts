import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'product-search',
    loadComponent: () =>
      import('./features/product-search/product-search.component').then(
        (m) => m.ProductSearchComponent,
      ),
  },
  {
    path: 'live-counter',
    loadComponent: () =>
      import('./features/live-counter/live-counter.component').then(
        (m) => m.LiveCounterComponent,
      ),
  },
  { path: '', redirectTo: 'live-counter', pathMatch: 'full' },
];
