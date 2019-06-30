import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BookSearchService } from './book-search.service';
import { MatchingParagraph, SearchResults } from './book-search.utils';

// @todo mirror these to github pages
export enum BookChoice {
  ALICE_IN_WONDERLAND = 'https://raw.githubusercontent.com/zakhenry/blog-posts/master/posts/observable-workers-deep-dive/src/assets/alice.txt',
  SHERLOCK_HOLMES = 'https://raw.githubusercontent.com/zakhenry/blog-posts/master/posts/observable-workers-deep-dive/src/assets/sherlock.txt',
}

@Component({
  selector: 'app-book-search',
  templateUrl: './book-search.component.html',
  styleUrls: ['./book-search.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookSearchComponent {

  public componentName = 'Main thread search';

  public bookChoices = [
    {
      url: BookChoice.ALICE_IN_WONDERLAND,
      name: 'Alice in Wonderland',
    },
    {
      url: BookChoice.SHERLOCK_HOLMES,
      name: 'Sherlock Holmes',
    },
  ];

  public bookSelectionFormControl = new FormControl(null);
  public userBookSelection$: Observable<BookChoice> = this
    .bookSelectionFormControl.valueChanges;

  public searchTermFormControl = new FormControl(null);
  public userSearchTerm$: Observable<string> = this.searchTermFormControl
    .valueChanges;

  private searchResults$: Observable<SearchResults> = this.bookSearchHandler.search(
    this.userBookSelection$,
    this.userSearchTerm$,
  );

  private searchResultParagraphs$ = this.searchResults$.pipe(map(result => result.paragraphs));
  private searchResultProgress$ = this.searchResults$.pipe(map(result => [result.searchedParagraphCount, result.paragraphCount]));

  constructor(private bookSearchHandler: BookSearchService) {}
}
