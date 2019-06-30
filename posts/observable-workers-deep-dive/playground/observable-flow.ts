import { from, Observable, of } from 'rxjs';
import { scan, shareReplay, switchMap } from 'rxjs/operators';

/**
 * First off, we create a quick enum of the books we will use as a demo. Later
 * we will update the urls to be correct
 */
enum BookChoice {
  ALICE_IN_WONDERLAND = 'http://some-url-to-alice-in-wonderland-text',
  SHERLOCK_HOLMES = 'http://some-url-to-sherlock-holmes-text',
}

/**
 * This observable will be something like a regular dropdown, emitted whenever
 * the user changes their selection.
 */
const userBookSelection$ = of(BookChoice.ALICE_IN_WONDERLAND);

/**
 * This observable represents the stream of search terms the user will enter
 * into a text box. We `shareReplay(1)` so that subsequent subscribers will get
 * the latest value
 */
const userSearchTerm$ = of(`we’re all mad here`).pipe(shareReplay(1));

/**
 * This function will be responsible for fetching the content of the book given
 * the enum. We're cheating a little by making the enum value the url to fetch.
 * For now we will just pretend the url is the content of the book.
 * @todo implement
 */
function getBookText(bookChoice: BookChoice): Observable<string> {
  return of(bookChoice);
}

/**
 * This function will be responsible for taking the search term and returning
 * the stream of paragraphs found, as soon as they are found.
 *
 * For the purposes of quick testing, we've hardcoded as if two search results
 * were found
 *
 * We will also likely extend this return type in future to handle highlighting
 * the search phrase, but for now just the paragraph is sufficient for testing
 * @todo implement
 */
function getSearchResults(
  searchTerm: string,
  bookText: string,
): Observable<string> {
  return from([
    searchTerm + ' (this will be the first result)',
    searchTerm + ' (this will be the second result)',
  ]);
}

/**
 * Here we take the user selected book stream and pipe it via switchMap to fetch
 * the content of the book. We use switchMap() because we want to cancel the
 * download of the book if the user switches to a different book to search
 * before the book has finished downloading.
 *
 * Next we again switchMap() the result of the book content to the user search
 * term observable so that if the user has changed books, once it is loaded we
 * will cancel the processing of the current search term.
 *
 * Next we pass that stream of search terms to getSearchResults() which will
 * itself be returning a stream of search results for that search string.
 *
 * Finally, we use a scan() operator to collate the stream of search results
 * into an array so that we can present all results to the user, not just the
 * most recent one
 */
const searchResults$ = userBookSelection$.pipe(
  switchMap(selection => getBookText(selection)),
  switchMap(bookText => {
    return userSearchTerm$.pipe(
      switchMap(searchTerm =>
        getSearchResults(searchTerm, bookText).pipe(
          scan((searchResults: string[], searchResult) => {
            return [...searchResults, searchResult];
          }, []),
        ),
      ),
    );
  }),
);

/**
 * Last but not least, to check our logic, we subscribe to the observable and
 * bind the console so we see output.
 */
searchResults$.subscribe(console.log);
