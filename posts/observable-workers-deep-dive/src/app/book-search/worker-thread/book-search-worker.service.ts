import { Injectable } from '@angular/core';
import { fromWorker } from 'observable-webworker';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BookSearchService } from '../main-thread/book-search.service';
import { SearchResults, WorkerInput } from '../common/book-search.utils';

@Injectable({
  providedIn: 'root',
})
export class BookSearchWorkerService extends BookSearchService {
  protected processSearch(
    url$: Observable<string>,
    search$: Observable<string>,
  ): Observable<SearchResults> {
    const input$: Observable<WorkerInput> = combineLatest(url$, search$).pipe(
      map(([url, searchTerm]) => ({ searchTerm, url })),
    );

    return fromWorker(
      () => new Worker('./book-search.worker', { type: 'module' }),
      input$,
    );
  }
}
