import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, scan, shareReplay, switchMap } from 'rxjs/operators';
import { BookChoice } from './book-search.component';

@Injectable({
  providedIn: 'root',
})
export class BookSearchHandler {

  constructor(private http: HttpClient) { }

  public search(bookSelection$: Observable<BookChoice>, searchTerm$: Observable<string>): Observable<string[]> {

    const search$ = searchTerm$.pipe(shareReplay(1));

    return bookSelection$.pipe(
      switchMap(url => this.fetchFile(url)),
      switchMap(bookText => {
        return search$.pipe(
          switchMap(searchTerm =>
            this.getSearchResults(searchTerm, bookText).pipe(
              scan((searchResults: string[], searchResult: string) => {
                return [...searchResults, searchResult];
              }, []),
            ),
          ),
        );
      }),
    );

  }

  private getSearchResults(searchTerm: string, bookText: string): Observable<string> {

    const paragraphs = bookText.split('\n\n');

    const results = paragraphs.filter(p => p.indexOf(searchTerm) >= 0);

    return from([searchTerm, `book is ${bookText.length} chars long, ${results.length} paragraphs match`, ...results.slice(0, 10)]);
  }

  private fetchFile(url: string): Observable<string> {
    return this.http.get(url, {responseType: 'text'}).pipe(shareReplay(1));
  }

}
