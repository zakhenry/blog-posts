import { Component } from '@angular/core';
import { BookSearchWorkerService } from './book-search-worker.service';
import { BookSearchComponent } from './book-search.component';
import { BookSearchService } from './book-search.service';

@Component({
  selector: 'app-book-search-worker',
  templateUrl: './book-search.component.html',
  styleUrls: ['./book-search.component.css'],
  providers: [
    { provide: BookSearchService, useClass: BookSearchWorkerService },
  ],
})
export class BookSearchWorkerComponent extends BookSearchComponent {}
