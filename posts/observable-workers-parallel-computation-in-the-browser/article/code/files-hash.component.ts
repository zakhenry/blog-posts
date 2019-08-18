import { Component } from '@angular/core';

@Component({
  selector: 'app-files-hash',
  templateUrl: './files-hash.component.html',
  styleUrls: ['./files-hash.component.scss']
})
export class FilesHashComponent {

  public hashFiles($event): void {
    const files: File[] = Array.from($event.target.files);
    console.log(files);
  }

}
