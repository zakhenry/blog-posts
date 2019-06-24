import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { BookSearchService } from './book-search.service';

// @todo mirror these to github pages
export enum BookChoice {
  ALICE_IN_WONDERLAND = 'https://raw.githubusercontent.com/zakhenry/blog-posts/master/posts/observable-workers-deep-dive/src/assets/alice.txt',
  SHERLOCK_HOLMES = 'https://raw.githubusercontent.com/zakhenry/blog-posts/master/posts/observable-workers-deep-dive/src/assets/sherlock.txt',
}

@Component({
  selector: 'app-book-search',
  templateUrl: './book-search.component.html',
  styleUrls: ['./book-search.component.css'],
})
export class BookSearchComponent {
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

  public searchResults$: Observable<string[]> = this.bookSearchHandler.search(
    this.userBookSelection$,
    this.userSearchTerm$,
  );

  constructor(private bookSearchHandler: BookSearchService) {}
}
