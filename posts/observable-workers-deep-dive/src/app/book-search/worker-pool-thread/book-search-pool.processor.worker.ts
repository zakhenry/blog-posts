import { DoWork, ObservableWorker } from 'observable-webworker';
import { combineLatest, Observable } from 'rxjs';
import { filter, map, switchMap, tap } from 'rxjs/operators';
import { getSearchResults, SearchMatch } from '../common/book-search.utils';
import {
  ParagraphsMessage,
  SearchTermMessage,
  WorkerPoolMessage,
} from './book-search-pool.interfaces';

@ObservableWorker()
export class BookSearchPoolProcessorWorker
  implements DoWork<WorkerPoolMessage, SearchMatch> {
  public work(input$: Observable<WorkerPoolMessage>): Observable<SearchMatch> {
    const searchTerm$ = input$.pipe(
      filter(message => message.type === 'SearchTermMessage'),
      map((message: SearchTermMessage) => message.payload),
    );

    const paragraphs$ = input$.pipe(
      filter(message => message.type === 'ParagraphsMessage'),
      map((message: ParagraphsMessage) => message.payload),
    );

    return searchTerm$.pipe(
      switchMap(searchTerm =>
        paragraphs$.pipe(
          switchMap(paragraphs => {
            return getSearchResults(searchTerm, paragraphs);
          }),
        ),
      ),
    );
  }
}
