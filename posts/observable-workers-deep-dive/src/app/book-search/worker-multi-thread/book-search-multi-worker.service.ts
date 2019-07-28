import { Injectable } from '@angular/core';
import { fromWorker } from 'observable-webworker';
import { combineLatest, Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { BookSearchService } from '../main-thread/book-search.service';
import { SearchResults, WorkerInput } from '../common/book-search.utils';

@Injectable({
  providedIn: 'root',
})
export class BookSearchMultiWorkerService extends BookSearchService {
  protected processSearch(
    url$: Observable<string>,
    search$: Observable<string>,
  ): Observable<SearchResults> {
    const input$: Observable<WorkerInput> = combineLatest(url$, search$.pipe(startWith(''))).pipe(
      map(([url, searchTerm]) => ({ searchTerm, url })),
    );

    return fromWorker(
      () => new Worker('./book-search.dispatcher.worker', { type: 'module' }),
      input$,
    );
  }
}
