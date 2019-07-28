import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BookSearchWorkerPoolComponent } from './book-search/worker-pool-thread/book-search-worker-pool.component';
import { BookSearchWorkerComponent } from './book-search/worker-thread/book-search-worker.component';
import { BookSearchComponent } from './book-search/main-thread/book-search.component';

@NgModule({
  declarations: [AppComponent, BookSearchComponent, BookSearchWorkerComponent, BookSearchWorkerPoolComponent],
  imports: [BrowserModule, ReactiveFormsModule, HttpClientModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
