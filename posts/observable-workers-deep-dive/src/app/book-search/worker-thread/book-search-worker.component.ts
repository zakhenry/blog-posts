import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BookSearchWorkerService } from './book-search-worker.service';
import { BookSearchComponent } from '../main-thread/book-search.component';
import { BookSearchService } from '../main-thread/book-search.service';

@Component({
  selector: 'app-book-search-worker',
  templateUrl: '../main-thread/book-search.component.html',
  styleUrls: ['../main-thread/book-search.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: BookSearchService, useClass: BookSearchWorkerService },
  ],
})
export class BookSearchWorkerComponent extends BookSearchComponent {
  public componentName = 'Worker thread search';
}
