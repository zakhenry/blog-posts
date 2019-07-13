import { from, Observable, of } from 'rxjs';
import {
  concatMap,
  delay,
  map,
  pairwise,
  scan,
  shareReplay,
  startWith,
  switchMap,
  timestamp,
} from 'rxjs/operators';

enum BookChoice {
  ALICE_IN_WONDERLAND = 'http://alice.text',
  SHERLOCK_HOLMES = 'http://sherlock.text',
}

/**
 * This is a nice little custom operator that spaces out observables by a certain amount, this is super handy for
 * emulating user events (humans are slooow!)
 */
function separateEmissions<T>(delayTime: number) {
  return (obs$: Observable<T>): Observable<T> => {
    return obs$.pipe(
      concatMap((v, i) => (i === 0 ? of(v) : of(v).pipe(delay(delayTime)))),
    );
  };
}

/**
 * For the book selection, we've piped to separateEmissions() with 4000ms
 * defined, this means when subscribed the observable will immediately emit
 * Alice in Wonderland content, then 4 seconds later emit Sherlock Holmes content.
 */
const userBookSelection$ = from([
  BookChoice.ALICE_IN_WONDERLAND,
  BookChoice.SHERLOCK_HOLMES,
]).pipe(separateEmissions(4000));

/**
 * Slightly different strategy for this one - we're
 * 1. Piping delayed user book selection to vary the search phrase depending on
 * which book is selected
 * 2. creating a streams of individual characters
 * 3. spacing out the emissions by 100ms (this is the inter-keystroke time)
 * 4. using scan to combine the previous characters
 * The result is a pretty good simulation of the user typing the phrase at 10
 * keys per second
 */
const userSearchTerm$ = userBookSelection$.pipe(
  delay(200),
  switchMap(book => {
    const searchPhrase =
      book === BookChoice.ALICE_IN_WONDERLAND
        ? `we’re all mad here`
        : `nothing more deceptive than an obvious fact`;

    return from(searchPhrase).pipe(
      separateEmissions(100),
      scan((out, char) => out + char, ''),
    );
  }),
  shareReplay(1),
);

/**
 * Here, we're guessing it will take about 200ms to download the book. We've
 * also put in a console.log so we can make sure we're not going to try download
 * the book on every keystroke!
 * @param bookChoice
 */
function getBookText(bookChoice: BookChoice): Observable<string> {
  console.log(`getBookText called (${bookChoice})`);
  return of(bookChoice).pipe(delay(200));
}

/**
 * With this function we're saying that the search takes (20 milliseconds * the
 * length of the search string)
 * This is actually totally unrealistic, but the linear variability will help
 * when understanding the logs
 */
function getSearchResults(
  searchTerm: string,
  bookText: string,
): Observable<string> {
  return from([' (first search result)', ' (second search result)']).pipe(
    map(result => `${bookText} : ${searchTerm} : ${result}`),
    delay(20 * searchTerm.length),
    separateEmissions(200),
  );
}

/**
 * This is unchanged from before
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
 * Lastly we'd doing a few tricks to make the output express what happened
 * better.
 * The combination of timestamp and pairwise gives us a stream of when the
 * emission happened and bundles it with the previous one so we can compare
 * times to get a time taken value. The startWith(null) just gives us the
 * startup time as a baseline.
 * Lastly we use our old friend map() to output the data in a nice format for
 * the logger.
 */
searchResults$
  .pipe(
    startWith(null),
    timestamp(),
    pairwise(),
    map(([before, tsResult], i) => {
      const timeSinceLast = (tsResult.timestamp - before.timestamp) / 1000;
      return `${i} : Search Result: [${tsResult.value.join(
        ', ',
      )}] (+${timeSinceLast} seconds)`;
    }),
  )
  .subscribe(console.log);
