import { from, Observable, of } from "rxjs";
import {
  concatMap,
  delay,
  map,
  pairwise,
  scan,
  shareReplay,
  startWith,
  switchMap,
  tap,
  timestamp
} from "rxjs/operators";

enum BookChoice {
  ALICE_IN_WONDERLAND = "http://some-url-to-alice-in-wonderland-text",
  SHERLOCK_HOLMES = "http://some-url-to-sherlock-holmes-text"
}

/**
 * This is a nice little custom operator that spaces out observables by a certain amount, this is super handy for
 * emulating user events (people are slooow!)
 */
function separateEmissions<T>(delayTime: number) {
  return (obs$: Observable<T>): Observable<T> => {
    return obs$.pipe(
      concatMap((v, i) => (i === 0 ? of(v) : of(v).pipe(delay(delayTime))))
    );
  };
}

/**
 * For the book selection, we've piped to separateEmissions() with 4000ms defined, this means when subscribed the
 * observable will immediately emit Alice in Wonderland, then 4 seconds later emit Sherlock Holmes.
 */
const userBookSelection$ = from([
  BookChoice.ALICE_IN_WONDERLAND,
  BookChoice.SHERLOCK_HOLMES
]).pipe(separateEmissions(4000));

/**
 * Slightly different strategy for this one - we're
 * 1. creating a streams of individual characters
 * 2. spacing out the emissions by 150ms (this is the inter-keystroke time)
 * 3. using scan to combine the previous characters
 * The result is a pretty good simulation of the user typing the phrase at 6-7 keys per second
 */
const userSearchTerm$ = from(`we’re all mad here`).pipe(
  separateEmissions(150),
  scan((out, char) => out + char, ""),
  shareReplay(1)
);

/**
 * Here, we're guessing it will take about 200ms to download the book. We've also put in a console.log so we can make
 * sure we're not going to try download the book on every keystroke!
 * @param bookChoice
 */
function getBookText(bookChoice: BookChoice): Observable<string> {
  console.log(`getBookText called (${bookChoice})`);
  return of(bookChoice).pipe(delay(200));
}

/**
 * With this function we're saying that the search takes (20 milliseconds * the length of the search string)
 * This is actually totally unrealistic, but the linear variability will help when understanding the logs
 */
function getSearchResults(
  searchTerm: string,
  bookText: string
): Observable<string> {
  return from([
    searchTerm + " (this will be the first result)",
    searchTerm + " (this will be the second result)"
  ]).pipe(delay(20 * searchTerm.length));
}

/**
 * This is unchanged
 */
const searchResults$ = userBookSelection$.pipe(
  switchMap(selection => getBookText(selection)),
  switchMap(bookText => {
    return userSearchTerm$.pipe(
      switchMap(searchTerm =>
        getSearchResults(searchTerm, bookText).pipe(
          scan((searchResults: string[], searchResult) => {
            return [...searchResults, searchResult];
          }, [])
        )
      )
    );
  })
);

/**
 * Lastly we'd doing a few tricks to make the output express what happened better.
 * The combination of timestamp and pairwise gives us a stream of when the emission happened and bundles it
 * with the previous one so we can compare times to get a time taken value. The startWith(null) just gives us the
 * startup time as a baseline.
 * Lastly we use our old friend map() to output the data in a nice format for the logger.
 */
searchResults$
  .pipe(
    startWith(null),
    timestamp(),
    pairwise(),
    map(([before, tsResult], i) => {
      const timeSinceLast = (tsResult.timestamp - before.timestamp) / 1000;
      return `${i} : Search Result: [${tsResult.value.join(', ')}] (+${timeSinceLast} seconds)`;
    })
  )
  .subscribe(console.log);
