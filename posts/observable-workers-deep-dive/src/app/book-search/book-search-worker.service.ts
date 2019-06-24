import { Injectable } from '@angular/core';
import { fromWorker } from 'observable-webworker';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BookSearchService } from './book-search.service';
import { WorkerInput } from './book-search.utils';



@Injectable({
  providedIn: 'root',
})
export class BookSearchWorkerService extends BookSearchService {

  protected processFile(url: string, search$: Observable<string>): Observable<string[]> {
    const input$: Observable<WorkerInput> = search$.pipe(map(searchTerm => ({searchTerm, url})));

    return fromWorker(() => new Worker('./book-search.worker', { type: 'module' }), input$);
  }

}
