---
title: "Observable Web Workers in depth"
published: false
description: "Deep dive into Observable Web Workers building an example application which utilises the power of Web Workers with the fluent message passing patterns observables give."
tags: web worker, observable, rxjs, angular
series: observable-webworkers
---

In the [Previous article](https://dev.to/zakhenry/observable-webworkers-with-angular-8-4k6) we took a look at the library [`observable-webworker`](https://www.npmjs.com/package/observable-webworker) which lets us use familiar observable patterns to construct and manage Web Workers and the communication between the threads. In this article we will develop an application, first without a web worker, then refactor it to use a web worker to demonstrate the power and usefulness of web workers. If you haven't read the previous article, I do recommend you do so first as it goes over all the prerequisites to getting up and running, and the background of what web workers are, which I will skip over here.


## The Brief

The application we're going to build has a few requirements, I'll lay these out as acceptance criteria that we can refer to later. 

> As a user I want to be able to search through text of a variety of novels fetched from [Project Gutenberg](https://www.gutenberg.org/). My search results should contain my search phrase highlighted within the context of the matching paragraph.

For fun I'll detail the criteria in the [BDD Gherkin syntax](https://cucumber.io/docs/guides/10-minute-tutorial/)

```feature
Feature: Find phrases in books by searching for them

Background:
    Given I'm a user on the home page
    And I have selected the book "Alice in Wonderland"
    And I see a free text field in which I can type my search phrase

Scenario
    When I type "we’re all mad here"
    Then I should see a search result with the text "‘Oh, you can’t help that,’ said the Cat: ‘we’re all mad here. I’m mad. You’re mad.’"
    
Scenario
    When I type "mad"
    Then I should see search results with "mad" highlighted "45" times
```

Additional to these user journey requirements, we will have the following performance requirements: 
* the user interface must remain responsive at all times
* the user gets their search results live with every keystroke
* the user can change book and the search immediate begins returning results for their previous search
* the above requirements apply to an underpowered machine such as a mobile device

## Quick Plan

To start with we will write down a scratch file of the observable flow, then later build it out into the application.

```ts
// playground/observable-flow.ts

import { from, Observable, of } from "rxjs";
import { scan, shareReplay, switchMap } from "rxjs/operators";

/**
 * First off, we create a quick enum of the books we will use as a demo. Later
 * we will update the urls to be correct
 */
enum BookChoice {
  ALICE_IN_WONDERLAND = "http://some-url-to-alice-in-wonderland-text",
  SHERLOCK_HOLMES = "http://some-url-to-sherlock-holmes-text"
}

/**
 * This observable will be something like a regular dropdown, emitted whenever
 * the user changes their selection.
 */
const userBookSelection$ = of(BookChoice.ALICE_IN_WONDERLAND);

/**
 * This observable represents the stream of search terms the user will enter
 * into a text box. We `shareReplay(1)`
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
  bookText: string
): Observable<string> {
  return from([
    searchTerm + " (this will be the first result)",
    searchTerm + " (this will be the second result)"
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
          }, [])
        )
      )
    );
  })
);

/**
 * Last but not least, to check our logic, we subscribe to the observable and
 * bind the console so we see output.
 */
searchResults$.subscribe(console.log);

```

Alrighty, we've got a concept of what we're trying to build, so what do we get when we run it? I like to use `ts-node` for these kind of quick tests, so just run `npx ts-node playground/observable-flow.ts` (tip: the `--skip-project` bit is just because I'm currently in a working directory that has a tsconfig.json file that is not compatible with just running a plain nodejs script.)

Our output of the above file is as follows:

<!-- embedme playground/observable-flow-out.txt --> 
```txt
[ 'we’re all mad here (this will be the first result)' ]
[
  'we’re all mad here (this will be the first result)',
  'we’re all mad here (this will be the second result)'
]

```
Okay, so this is expected - we first get one result in an array, then we get both results in the array. Success? Well kinda, but we'd really like to put some realism into this script so that we can see that our observables are having the right behavior.

So, we will now edit the script we just wrote to add a bunch of realistic delays and some more logging to see what is really going on:

```ts
// playground/observable-flow-test.ts

import { from, Observable, of } from 'rxjs';
import {
  concatMap,
  delay, filter, finalize,
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
 * emulating user events (people are slooow!)
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
 * Alice in Wonderland, then 4 seconds later emit Sherlock Holmes.
 */
const userBookSelection$ = from([
  BookChoice.ALICE_IN_WONDERLAND,
  BookChoice.SHERLOCK_HOLMES,
]).pipe(separateEmissions(4000));

/**
 * Slightly different strategy for this one - we're
 * 1. Piping delayed user book selection to vary the search phrase
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
  return from([' (first result)', ' (second result)']).pipe(
    map(result => `${bookText} : ${searchTerm} : ${result}`),
    delay(20 * searchTerm.length),
    separateEmissions(200),
  );
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

```


<!-- embedme playground/observable-flow-test-out.txt --> 
```txt
getBookText called (http://alice.text)
0 : Search Result: [http://alice.text : w :  (first result)] (+0.431 seconds)
1 : Search Result: [http://alice.text : we :  (first result)] (+0.123 seconds)
2 : Search Result: [http://alice.text : we’ :  (first result)] (+0.128 seconds)
3 : Search Result: [http://alice.text : we’r :  (first result)] (+0.121 seconds)
4 : Search Result: [http://alice.text : we’re :  (first result)] (+0.121 seconds)
5 : Search Result: [http://alice.text : we’re all mad here :  (first result)] (+1.6 seconds)
6 : Search Result: [http://alice.text : we’re all mad here :  (first result), http://alice.text : we’re all mad here :  (second result)] (+0.204 seconds)
getBookText called (http://sherlock.text)
7 : Search Result: [http://sherlock.text : n :  (first result)] (+1.704 seconds)
8 : Search Result: [http://sherlock.text : no :  (first result)] (+0.125 seconds)
9 : Search Result: [http://sherlock.text : not :  (first result)] (+0.124 seconds)
10 : Search Result: [http://sherlock.text : noth :  (first result)] (+0.125 seconds)
11 : Search Result: [http://sherlock.text : nothi :  (first result)] (+0.122 seconds)
12 : Search Result: [http://sherlock.text : nothing more deceptive than an obvious fact :  (first result)] (+4.68 seconds)
13 : Search Result: [http://sherlock.text : nothing more deceptive than an obvious fact :  (first result), http://sherlock.text : nothing more deceptive than an obvious fact :  (second result)] (+0.201 seconds)

```

Alrighty let's dig into this a bit.

We can see straight away that we fetch the Alice in Wonderland book immediately, and never again - this is perfect.

Next as the phrase begins to be typed we first get one result, then the other is appended to the results, good good.

Later on (the line starting with `5`) we can see that the search result slowdown has meant that we're getting results less frequently and they are for longer search phrases than just the next character - this is what we expect as it means that the switchMap is unsubscribing from the search processor function as there is different data to be processed. This is a great opportunity to compare the different behaviors of `switchMap()`, `mergeMap()` and `exhaustMap()`.

If we had chosen `mergeMap()`, we would see every single search result for every keystroke, but likely all overlapping with each other and would be pretty confusing. Also the overall time would be longer, assuming the CPU was saturated while processing the search.

If we had chosen `exhaustMap()`, we would get the exhaustive set of results (hence the name!) in the correct order, however the overall time would be _way_ longer as we had to wait sequentially. 

In this case I think `switchMap()` is the correct behavior as the user is not interested in interim search results before they have finished typing, and we gain efficiency by immediately cancelling computation of irrelevant search results.

Back to the output analysis, in the line marked `7` we see we've switched to fetching Sherlock Holmes with the new search phrase. Success!

Okay, we're in a state now where we're pretty confident in the general data flow, let's start building the application.

So far we've just been working with a single typescript file, to work though our ideas, but now we're going to jump into using a framework as this is much more realistic to our real world problems we hope to solve by understanding this article.

I'm going to use Angular, but if you're a React or other awesome framework user don't fret as this is going to be fairly framework agnostic anyway. If you've made it this far, it's probably safe to assume you have the basics down pat so I'll gloss over that.

I love working on the bleeding edge, so we will use both Bazel and Ivy.
```
ng new observable-workers-deep-dive --collection=@angular/bazel --experimental-ivy=true
```

```
ng generate component book-search
```

