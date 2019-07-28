import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BookSearchMultiWorkerService } from './book-search-multi-worker.service';
import { BookSearchComponent } from '../main-thread/book-search.component';
import { BookSearchService } from '../main-thread/book-search.service';

@Component({
  selector: 'app-book-search-multi-worker',
  templateUrl: '../main-thread/book-search.component.html',
  styleUrls: ['../main-thread/book-search.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: BookSearchService, useClass: BookSearchMultiWorkerService },
  ],
})
export class BookSearchMultiWorkerComponent extends BookSearchComponent {
  public componentName = 'Multi Worker thread search';
}
