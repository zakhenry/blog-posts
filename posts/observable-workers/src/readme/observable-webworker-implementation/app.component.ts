import { Component } from '@angular/core';
import { fromWorker } from 'observable-webworker';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  runWorker() {

    const input$: Observable<string> = of('hello');

    fromWorker<string, string>(() => new Worker('./demo.worker', { type: 'module'}), input$)
      .subscribe(message => {
        console.log(`Got message`, message);
      });

  }

}
