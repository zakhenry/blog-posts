import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BookSearchWorkerPoolService } from './book-search-worker-pool.service';
import { BookSearchComponent } from '../main-thread/book-search.component';
import { BookSearchService } from '../main-thread/book-search.service';

@Component({
  selector: 'app-book-search-worker-pool',
  templateUrl: '../main-thread/book-search.component.html',
  styleUrls: ['../main-thread/book-search.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: BookSearchService, useClass: BookSearchWorkerPoolService },
  ],
})
export class BookSearchWorkerPoolComponent extends BookSearchComponent {
  public componentName = 'Worker pool thread search';
}
