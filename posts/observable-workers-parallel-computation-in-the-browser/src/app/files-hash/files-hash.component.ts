import { Component } from '@angular/core';
import { fromWorkerPool } from 'observable-webworker';
import { FileHashPayload } from './file-hasher.interface';

@Component({
  selector: 'app-files-hash',
  templateUrl: './files-hash.component.html',
  styleUrls: ['./files-hash.component.scss'],
})
export class FilesHashComponent {
  public hashFiles($event): void {
    const files: File[] = Array.from($event.target.files);
    console.log(`files`, files);
    fromWorkerPool<File, FileHashPayload>(
      () => new Worker(`./file-hasher.worker.ts`, { type: 'module' }),
      files,
    ).subscribe((hashPayload: FileHashPayload) => {
      console.log('Hashed file', hashPayload.filename, hashPayload.hash);
    });
  }
}
