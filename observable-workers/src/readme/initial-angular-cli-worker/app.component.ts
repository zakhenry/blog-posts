import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  runWorker() {

    const demoWorker = new Worker('./demo.worker', { type: 'module'});

    demoWorker.onmessage = (message) => {
      console.log(`Got message`, message.data);
    };

    demoWorker.postMessage('hello');

  }

}
