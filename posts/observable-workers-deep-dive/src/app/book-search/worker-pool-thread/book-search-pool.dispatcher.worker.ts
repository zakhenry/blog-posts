import { DoWork, fromWorker, ObservableWorker } from 'observable-webworker';
import {
  asyncScheduler,
  BehaviorSubject,
  combineLatest,
  merge,
  NEVER,
  Observable,
  ReplaySubject,
  Subject,
  throwError,
} from 'rxjs';
import { ajax } from 'rxjs/ajax';
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  observeOn,
  scan,
  share,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs/operators';
import {
  accumulateResults,
  getAccumulatedSearchResults,
  SearchMatch,
  SearchResults,
  WorkerInput,
} from '../common/book-search.utils';
import {
  ParagraphsMessage,
  SearchTermMessage,
  WorkerPoolMessage,
} from './book-search-pool.interfaces';

@ObservableWorker()
export class BookSearchPoolDispatcherWorker
  implements DoWork<WorkerInput, SearchResults> {
  public work(input$: Observable<WorkerInput>): Observable<SearchResults> {
    const url$ = input$.pipe(
      map(({ url }) => url),
      distinctUntilChanged(),
    );

    const searchTerm$ = input$.pipe(
      map(({ searchTerm }) => searchTerm),
      distinctUntilChanged(),
      shareReplay(1),
    );

    return url$.pipe(
      switchMap(url => ajax({ url, responseType: 'text' })),
      map(result => result.response),
      switchMap((bookText: string) => {
        const paragraphs = bookText.split('\n\n');

        const searchTermMessages$: Observable<
          WorkerPoolMessage
        > = searchTerm$.pipe(
          map(
            (searchTerm): SearchTermMessage => ({
              type: 'SearchTermMessage',
              payload: searchTerm,
            }),
          ),
        );

        return searchTermMessages$.pipe(
          switchMap(searchTermMessage => {
            const chunkSize = 10;

            const paragraphsIter = this.paragraphGenerator(
              paragraphs,
              chunkSize,
            );

            const searchResults = this.workers.map(
              ({ messages$, searchResults$ }) => {
                messages$.next(searchTermMessage);

                return searchResults$.pipe(
                  startWith(null),
                  filter(
                    r => !r || searchTermMessage.payload === r.searchString,
                  ),
                  map((res, index) => {
                    if (
                      index === 0 ||
                      (res && res.paragraphNumber === chunkSize - 1)
                    ) {
                      const chunk = paragraphsIter.next().value;

                      if (chunk) {
                        messages$.next({
                          type: 'ParagraphsMessage',
                          payload: chunk,
                        });
                      }
                    }

                    return res;
                  }),
                  filter(r => !!r),
                );
              },
            );

            return merge(...searchResults).pipe(
              accumulateResults(paragraphs.length),
            );
          }),
        );
      }),
    );
  }

  private workerCount = navigator.hardwareConcurrency - 2;

  private workers: {
    messages$: Subject<WorkerPoolMessage>;
    searchResults$: Observable<SearchMatch>;
  }[] = Array.from({
    length: this.workerCount,
  }).map(() => {
    const messages$ = new Subject<WorkerPoolMessage>();

    const searchResults$ = fromWorker<WorkerPoolMessage, SearchMatch>(
      () =>
        new Worker('./book-search-pool.processor.worker', { type: 'module' }),
      messages$,
    ).pipe(share());

    // keep the worker alive, it will be destroyed when this worker is killed
    searchResults$.subscribe();

    return { messages$, searchResults$ };
  });

  private *paragraphGenerator(paragraphs: string[], chunkSize: number) {
    const chunkCount = Math.ceil(paragraphs.length / chunkSize);

    for (let i = 0; i < chunkCount; i++) {
      const start = i * chunkSize;
      const end = i < chunkCount - 1 ? (i + 1) * chunkSize : undefined;
      const chunk = paragraphs.slice(start, end);
      yield chunk;
    }
  }
}
