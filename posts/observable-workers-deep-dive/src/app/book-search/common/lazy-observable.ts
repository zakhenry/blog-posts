import { asyncScheduler, Observable, Subject, timer } from 'rxjs';
import { map, observeOn, take, takeUntil, tap } from 'rxjs/operators';

function slowProcessor(exponent: number): number {
  let j = 1;
  for (let i = 0; i < 2 ** 28; i++) {
    j += i % 2 ? i : -i;
  }

  return j;
}

// console.time('a');
// console.log(slowProcessor());
// console.timeEnd('a');

function* problemGenerator(startWith: number) {
  for (let i = startWith; i < Infinity; i++) {
    yield i;
  }
}

function fromIteratorLazy<T>(
  iterator: IterableIterator<T>,
  onNext: Subject<any>,
): Observable<T> {
  return new Observable<T>(subscriber => {
    const sub = onNext.subscribe(() => {
      const res = (iterator as any).next();

      subscriber.next(res.value);

      if (res.done) {
        subscriber.complete();
      }
    });

    return () => sub.unsubscribe();
  }).pipe(observeOn(asyncScheduler));
}

const timeEnd$ = timer(10000);

const pullSubject = new Subject();

fromIteratorLazy(problemGenerator(10), pullSubject)
  .pipe(
    // delay(0),
    // take(10),
    takeUntil(timeEnd$),
    map((v: number) => {
      console.time('exponent: ' + v);
      const res = slowProcessor(v);
      console.timeEnd('exponent: ' + v);

      return 'outcome: ' + res;
    }),
    tap(() => pullSubject.next()),
  )
  .subscribe({
    next: v => console.log(v),
    complete: () => console.log('done'),
  });

pullSubject.next();
