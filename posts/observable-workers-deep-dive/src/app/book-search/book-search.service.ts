import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay, switchMap } from 'rxjs/operators';
import { BookChoice } from './book-search.component';
import { accumulateResults, getSearchResults } from './book-search.utils';

@Injectable({
  providedIn: 'root',
})
export class BookSearchService {
  constructor(private http: HttpClient) {}

  public search(
    bookSelection$: Observable<BookChoice>,
    searchTerm$: Observable<string>,
  ): Observable<string[]> {
    const search$ = searchTerm$.pipe(shareReplay(1));

    return bookSelection$.pipe(
      switchMap(url => this.processFile(url, search$)),
    );
  }

  protected processFile(url: string, search$: Observable<string>): Observable<string[]> {
    return this.fetchFile(url).pipe(
      switchMap(bookText => {
        return search$.pipe(
          switchMap(searchTerm =>
            getSearchResults(searchTerm, bookText).pipe(
              accumulateResults()
            ),
          ),
        );
      }),
    );
  }

  private fetchFile(url: string): Observable<string> {
    return this.http.get(url, { responseType: 'text' }).pipe(shareReplay(1));
  }
}
