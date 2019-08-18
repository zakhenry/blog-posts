import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BookSearchComponent } from './book-search/main-thread/book-search.component';
import { BookSearchMultiWorkerComponent } from './book-search/worker-multi-thread/book-search-multi-worker.component';
import { BookSearchWorkerComponent } from './book-search/worker-thread/book-search-worker.component';

@NgModule({
  declarations: [
    AppComponent,
    BookSearchComponent,
    BookSearchWorkerComponent,
    BookSearchMultiWorkerComponent,
  ],
  imports: [BrowserModule, ReactiveFormsModule, HttpClientModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
