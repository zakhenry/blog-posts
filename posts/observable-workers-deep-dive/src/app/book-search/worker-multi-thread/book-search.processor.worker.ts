import { DoWork, ObservableWorker } from 'observable-webworker';
import { combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, switchMap, tap } from 'rxjs/operators';
import { accumulateResults, getSearchResults, SearchResults } from '../common/book-search.utils';
import { MultiWorkerMessage, ParagraphsMessage, SearchTermMessage } from './book-search-multi-worker.interfaces';

@ObservableWorker()
export class BookSearchProcessorWorker
  implements DoWork<MultiWorkerMessage, SearchResults> {
  public work(input$: Observable<MultiWorkerMessage>): Observable<SearchResults> {

    const searchTerm$ = input$.pipe(
      filter(message => message.type === 'SearchTermMessage'),
      map((message: SearchTermMessage) => message.payload),
      distinctUntilChanged(),
    );

    const paragraphs$ = input$.pipe(
      filter(message => message.type === 'ParagraphsMessage'),
      map((message: ParagraphsMessage) => message.payload),
      distinctUntilChanged(),
    );

    return combineLatest(searchTerm$, paragraphs$).pipe(
      switchMap(([searchTerm, paragraphs]) =>
        getSearchResults(searchTerm, paragraphs).pipe(
          accumulateResults(paragraphs.length)
        ),
      ),

    );
  }
}
