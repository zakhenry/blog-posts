import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { FilesHashComponent } from './files-hash/files-hash.component';

@NgModule({
  declarations: [
    AppComponent,
    FilesHashComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
