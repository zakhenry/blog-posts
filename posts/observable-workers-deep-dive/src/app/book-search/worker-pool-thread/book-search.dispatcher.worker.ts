import { DoWork, fromWorker, ObservableWorker } from 'observable-webworker';
import { combineLatest, Observable, throwError } from 'rxjs';
import { ajax } from 'rxjs/ajax';
import {
  catchError,
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs/operators';
import {
  accumulateResults,
  getAccumulatedSearchResults,
  SearchResults,
  WorkerInput,
} from '../common/book-search.utils';
import {
  SearchTermMessage,
  WorkerPoolMessage,
} from './book-search-pool.interfaces';

@ObservableWorker()
export class BookSearchDispatcherWorker
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

    const workerCount = 8//navigator.hardwareConcurrency - 2;

    return url$.pipe(
      switchMap(url => ajax({ url, responseType: 'text' })),
      map(result => result.response),
      switchMap((bookText: string) => {
        const paragraphs = bookText.split('\n\n');

        const workers$ = this.chunkParagraphs(paragraphs, workerCount).map(chunkedParagraphs => {
          const processorMessages$: Observable<
            WorkerPoolMessage
          > = searchTerm$.pipe(
            map(
              (searchTerm): SearchTermMessage => ({
                type: 'SearchTermMessage',
                payload: searchTerm,
              }),
            ),
            startWith({ type: 'ParagraphsMessage', payload: chunkedParagraphs }),
          );

          return fromWorker<WorkerPoolMessage, SearchResults>(
            () =>
              new Worker('./book-search.processor.worker', { type: 'module' }),
            processorMessages$,
          );
        });

        return combineLatest(workers$).pipe(
          map((searchResults: SearchResults[]) => {
            const accumulatedSearchResult = searchResults.reduce((searchResultAccumulated, searchResult) => {
              searchResultAccumulated.paragraphs.push(...searchResult.paragraphs);
              searchResultAccumulated.paragraphCount += searchResult.paragraphCount;
              searchResultAccumulated.searchedParagraphCount += searchResult.searchedParagraphCount;


              return searchResultAccumulated;
            }, {
              paragraphs: [],
              searchedParagraphCount: 0,
              paragraphCount: 0,
            });

            accumulatedSearchResult.paragraphs.sort((a,b) => b.score-a.score);
            accumulatedSearchResult.paragraphs.splice(10, Infinity);

            return accumulatedSearchResult;
          })
        )

      }),
    );
  }

  private chunkParagraphs(
    paragraphs: string[],
    chunkCount: number,
  ): string[][] {
    const chunkSize = Math.floor(paragraphs.length / chunkCount);
    const chunkedParagraphs = [];
    for (let i = 0; i < chunkCount; i++) {
      chunkedParagraphs.push(
        paragraphs.slice(
          i * chunkSize,
          i < chunkCount - 1 ? (i + 1) * chunkSize : undefined,
        ),
      );
    }

    return chunkedParagraphs;
  }
}
