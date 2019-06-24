import { from, Observable } from 'rxjs';
import { map, scan, startWith } from 'rxjs/operators';
import {
  FuzzyMatchSimilarity,
  fuzzySubstringSimilarity,
} from '../../../playground/fuzzy-substring';

interface SearchMatch {
  paragraph: string;
  searchMatch: FuzzyMatchSimilarity;
}

export function getSearchResults(
  searchTerm: string,
  bookText: string,
): Observable<SearchMatch> {
  const paragraphs = bookText.split('\n\n');

  return from(paragraphs).pipe(
    map(paragraph => {
      const searchMatch = fuzzySubstringSimilarity(searchTerm, paragraph);
      return { searchMatch, paragraph };
    }),
  );

  // return new Observable<SearchMatch>(observer => {
  //   paragraphs.forEach((paragraph: string, index) => {
  //     const searchMatch = fuzzySubstringSimilarity(searchTerm, paragraph);
  //     observer.next({ searchMatch, paragraph });
  //   });
  //
  //   observer.complete();
  // });
}

// @todo move
export function accumulateResults() {
  return (obs$: Observable<SearchMatch>): Observable<string[]> => {
    return obs$.pipe(
      scan((searchResults: SearchMatch[], searchResult: SearchMatch) => {
        return [...searchResults, searchResult];
      }, []),
      map(searchMatches => {
        return searchMatches
          .sort(
            (a, b) =>
              b.searchMatch.similarityScore - a.searchMatch.similarityScore,
          )
          .slice(0, 10)
          .map(({ searchMatch, paragraph }) => {
            return `Similarity: ${searchMatch.similarityScore} Distance: ${
              searchMatch.substringDistance
            } Match: "${paragraph.slice(
              searchMatch.startIndex,
              searchMatch.endIndex,
            )}" | ${paragraph}`;
          });
      }),
      startWith([]),
    );
  };
}

export interface WorkerInput {
  url: string;
  searchTerm: string;
}
