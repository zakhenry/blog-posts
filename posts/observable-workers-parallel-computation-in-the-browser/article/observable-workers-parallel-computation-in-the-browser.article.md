---
title: Parallel Computation in the Browser with Observable Webworkers
cover_image: ./max-vertsanov-qvRuue12Huw-unsplash.jpg
published: false
description: Improve upon the performance of a single webworker with multiple parallel webworkers.
tags: web worker, observable, rxjs, angular
series: observable-webworkers
id: 132596
---

In the [previous article](https://dev.to/zakhenry/observable-web-workers-a-deep-dive-into-a-realistic-use-case-4042) we dove deep into the use of webworkers to improve the responsiveness of the main thread by offloading computation into a web worker.

To facilitate the message passing, we used the library [`observable-webworker`](https://github.com/cloudnc/observable-webworker) to give us an easy to use RxJS stream-based API.

This strategy worked very well for that use case, however we aren't quite maximising the compute resources we have available to us.

Web browsers can spin up multiple _parallel_ web workers that will each run on different threads of the operating system. This means that any computation we do in one worker will not slow down the computation of another worker. There is a limit to this however, as not only does the computer itself have a parallelisation limit (logical processor core count) browsers will self-limit the amount of concurrency web pages are allowed to use.

The amount of parallel threads that can be run can be determined by `navigator.hardwareConcurrency`. This number varies depending on both underlying hardware and browser implementation. For example most desktop browser give the core count, some mobile ones will limit this value, and some browsers (Safari) won't tell you at all.

To work out how many workers we can run in parallel, simply do `const workerCount = navigator.hardwareConcurrency - 1`. The `- 1` here is to keep a processor core spared for the main ui thread.

Put simply, with the worker pool strategy, we spin up as many workers as we are allowed, and construct a pool of work. Each worker picks up a task from the pool, executes the computation in on it's own core, then returns the results to the main thread, grabbing the next task or shutting down if there is no more work to be done.

---

To better explain this concept and how to implement it, we will build a simple little application that will take a list of files (using an `<input type="file" multiple />` element) and return the MD5 hash sum of those files to the main thread. This basic concept can be expanded to many different types of application, and is in itself a fairly useful application as you might want to use this strategy for hashing multiple files for upload to AWS S3 for instance.

Let's start off by outlining exactly what we're trying to achieve. I'll use a little diagram syntax that is loosely based on the [RxJS marble testing](https://github.com/ReactiveX/rxjs/blob/master/docs_app/content/guide/testing/marble-testing.md) syntax.

- `-` idle/waiting time
- `^` transferring file to worker thread
- `*` processing file
- `|` hash computed, returning results

Take the following diagram:

```
file-1.txt  ----^*******|
```

With the key above, we can see that we're showing that for `file-1.txt` there was some idle time, then the file was picked up, processing ran for some time then the result was returned.

We can use this syntax to show what would happen if we were to compute the hashes for the files one at a time:

```
file-1.txt  ^*******|
file-2.txt  ---------^***|
file-3.txt  --------------^**********|
file-4.txt  --------------------------^********|
file-5.txt  ------------------------------------^*********|
file-6.txt  -----------------------------------------------^****|

results     --------1----2------------3--------4----------5-----6
```

I've simulated the files being different sizes/taking different time to hash by extending the processing time (`*`) randomly.
The last line shows the results as they come back to the main thread, with the number just being the file number.

So from this diagram we can see that the total time to get the hash results of all 6 files is the individual durations of each file processing all added up. With a worker pool we can of course take advantage of parallel computing and run a number of these processes in parallel:

```
file-1.txt  ^*******|               # worker-1
file-2.txt  ^***|                   # worker-2
file-3.txt  ^**********|            # worker-3
file-4.txt  -----^********|         # worker-2
file-5.txt  ---------^*********|    # worker-1
file-6.txt  ------------^****|      # worker-3

results     ----2---1---3-4--6-5
```

In this diagram I've taken the exact same processing durations from above, but shifted the processing times assuming a parallelism count of three. You can see the dramatic effect this has on the overall processing time as once the first file completes (file-2.txt) the next file (file-4.txt) is immediately picked up for processing. You can also see that even while file-3.txt is still occupying one thread, the other two threads are able to complete their unit of work and pick up a new job. One thing to note for later is that the results are returned as soon as possible, which in this case means out of order. We will need to correlate each unit of work with it's result to marry up the data correctly.

Another way to look at the above scenario is with the same diagram syntax, but considering each worker rather than each file:

```
worker-1    ^*******|^*********|    # file-1.txt, file-5.txt
worker-2    ^***|^********|         # file-2.txt, file-4.txt
worker-3    ^**********|^****|      # file-3.txt, file-6.txt

results     ----2---1--3--4-6-5
```

The important thing to note here is that the workers are never idle - as soon as they're finished processing work they pick up another file for processing.

Now in our example we're only using three workers, but let's say the client machine has 8 logical cores and the browser lets you use them, the diagram would look like the following

```
file-1.txt  ^*******|               # worker-1
file-2.txt  ^***|                   # worker-2
file-3.txt  ^**********|            # worker-3
file-4.txt  ^********|              # worker-4
file-5.txt  ^*********|             # worker-5
file-6.txt  ^****|                  # worker-6

results     ----26--1453
```

Not so interesting, but we can see that the overall time took only as long as the longest file (file-3.txt) and also that we only needed six of the seven available workers.

Okay, we've talked through the theory, let's get practical!

I'm going to use Angular here as it's what I'm most familiar with, but the two libraries that we'll be using (`observable-webworker` and `js-md5`) are both framework agnostic, so if you're following along feel free to use the frontend framework you like best.

---

Let's start with a quick component that can load some files from the file system and print them to the console.

Template: `files-hash.component.html`

<!-- embedme ../src/app/files-hash/files-hash.component.html#L1-L1 -->

```html
<input type="file" multiple (change)="hashFiles($event)" />
```

Component: `files-hash.component.ts`

<!-- embedme ./code/files-hash.component.ts -->

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-files-hash',
  templateUrl: './files-hash.component.html',
  styleUrls: ['./files-hash.component.scss'],
})
export class FilesHashComponent {
  public hashFiles($event): void {
    const files: File[] = Array.from($event.target.files);
    console.log(files);
  }
}
```

Running this we will see a single file select and when we select a few files we see them logged in the console in an array. Easy.

Next let's create a webworker that will take a file as argument and return the hash of that file. We will not just return the hash string alone as we will need to correlate which hash corresponds to which file (remember from earlier we will get the results out of order).

First though, we define an interface to manage passing back this correlation of filename and hash:

<!-- embedme ../src/app/files-hash/file-hasher.interface.ts -->

`file-hasher.interface.ts`

```ts
export interface FileHashPayload {
  filename: string;
  hash: string;
}
```

Nothing exciting here, just an interface to hold the filename and the hash.

Now for the worker. We will need both `observable-webworker` and `js-md5` to handle the workers and the hashing respectively.

`yarn add -E observable-webworker js-md5`

Worker: `file-hasher.worker.ts`

<!-- embedme ../src/app/files-hash/file-hasher.worker.ts -->

```ts
import * as md5 from 'js-md5';
import { DoWorkUnit, ObservableWorker } from 'observable-webworker';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FileHashPayload } from './file-hasher.interface';

@ObservableWorker()
export class WorkerPoolHashWorker implements DoWorkUnit<File, FileHashPayload> {
  public workUnit(file: File): Observable<FileHashPayload> {
    return this.readFileAsArrayBuffer(file).pipe(
      map(arrayBuffer => ({ filename: file.name, hash: md5(arrayBuffer) })),
    );
  }

  private readFileAsArrayBuffer(blob: Blob): Observable<ArrayBuffer> {
    return new Observable(observer => {
      if (!(blob instanceof Blob)) {
        observer.error(
          new Error('`blob` must be an instance of File or Blob.'),
        );
        return;
      }

      const reader = new FileReader();

      reader.onerror = err => observer.error(err);
      reader.onload = () => observer.next(reader.result as ArrayBuffer);
      reader.onloadend = () => observer.complete();

      reader.readAsArrayBuffer(blob);

      return () => reader.abort();
    });
  }
}
```

Ok there's a few things going on here, so let's break them down.

<!-- embedme ../src/app/files-hash/file-hasher.worker.ts#L7-L8 -->

```ts
@ObservableWorker()
export class WorkerPoolHashWorker implements DoWorkUnit<File, FileHashPayload> {
```

In the class header we decorate it with `@ObservableWorker()` to register the class as a worker so that we can communicate with it from the main thread.

We also implement `DoWorkUnit<File, FileHashPayload>` which means that we need to implement a public method that takes a file and return an observable of `FileHashPayload`.

<!-- embedme ../src/app/files-hash/file-hasher.worker.ts#L9-L13 -->

```ts
public workUnit(file: File): Observable<FileHashPayload> {
  return this.readFileAsArrayBuffer(file).pipe(
    map(arrayBuffer => ({ filename: file.name, hash: md5(arrayBuffer) })),
  );
}
```

This method is pretty straight forward - we read the file as an array buffer (see the private method defined next for the implementation), then map the resulting array buffer to the `FileHashPayload` we defined earlier with the hash computed synchronously using the `js-md5` library.

Note that we're returning a completing observable here. This is critical to the functioning of the `observable-webworker` library when managing thread pools. It uses the completion notification to determine that the worker has completed that unit of work and is ready for another unit of work. We return observable as it allows us to return multiple events from the worker, which is useful for outputting progress events from long running processes.

Now back to the main thread to actually implement the worker pool.

<!-- embedme ../src/app/files-hash/files-hash.component.ts -->

```ts
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
```

This is quite similar to what we were doing in earlier articles with `fromWorker()` but this time we use `fromWorkerPool()` from `observable-webworker`. Like `fromWorker` the arguments are a factory to create a worker, and the input itself.

In this example we've used an `Array<File>` as input, however the `fromWorkerPool` method also takes an observable or an iterator.

Iterators can be very useful with this pattern as you can use their lazy evaluation feature to know _when_ the work has been picked up for processing, not just that it has been queued.

Observable can be useful as you're probably using observable streams anyway, and `fromWorkerPool` buffers the stream when the input rate exceeds the rate the worker pool can handle the work.

---

If we now run our application defined above, we will see on selection of a group of files something like the following:

```
files (10) [File, File, File, File, File, File, File, File, File, File]
Hashed file 1-monospondylic-Notelaea-140MB.txt 8b3e48ad838ba4b3024d42fa10591c82
Hashed file 2-safekeeper-unheedful-307MB.txt d1bef08d19b30f471f161c8f5fbf9a8a
Hashed file 4-pseudochromesthesia-laryngeal-162MB.txt d77b94eea8ad01c4e4b804fe9ecd26a2
Hashed file 3-gnatcatcher-incudes-361MB.txt 30c6b4c2ea8b1dd9e5222e8ab9f2119d
Hashed file 5-amacrine-Nance-188MB.txt 7be20804dde038994a2c0e6630643046
Hashed file 8-ankaratrite-dermatoheteroplasty-149MB.txt 72cb1a511a27ac023b9960dbc3959c40
Hashed file 7-enjambed-escutcheon-256MB.txt 1f5039e50bd66b290c56684d8550c6c2
Hashed file 6-idiograph-freckly-393MB.txt bcee52113567c0040a0db2c678dfe3c3
Hashed file 9-strandage-barrelage-179MB.txt 9eab43b111f3c7ff67536d031d06f69b
Hashed file 10-refinish-mellowy-378MB.txt 212374c37a433a7b06105090002297d0
```

To test I've [generated](https://github.com/cloudnc/observable-webworker/blob/master/generate-test-files.sh) a bunch of random files with the file size in their filename.

From the output we can see that we've achieved the expected outcome that we theorised earlier - the files are appearing in the logs, out of order and the files that are particularly large are ordered towards the end, as we would expect. **Success!**

Don't just take my word for it though - I've created a far more interactive demo at [https://cloudnc.github.io/observable-webworker](https://cloudnc.github.io/observable-webworker) which uses basically the exact same strategy outlined here, just with a bunch more progress messages to build a pretty timeline:

![Webworker Pool Demo](./webworker-pool-demo.gif)

To try it out, jump to the "Multiple Worker Pool" section and select some files. Don't worry - no files are sent out of the browser, feel free to check the source to verify or generate some random files like I did. Once you've selected the files, you'll see a timeline graph of the files being processed with whatever concurrency your machine can handle.

If you inspect the sources tab in your browser devtools you will see multiple workers being created to handle the workload, and they will be shut down as soon as there is no further work in the pool.

Additionally, if you select less files than you have concurrency available, you'll only spin up as many workers as files you've selected.

---

That's all for this article, I hope you've enjoyed it! Next up in the series we will be digging in to the performance penalties of transferring large objects to webworkers and a strategy to mitigate this cost.

---

The source for this article & demo is available at [https://github.com/zakhenry/blog-posts/tree/master/posts/observable-workers-parallel-computation-in-the-browser](https://github.com/zakhenry/blog-posts/tree/master/posts/observable-workers-parallel-computation-in-the-browser)

[<sub>Photo by Max Vertsanov on Unsplash</sub>](https://unsplash.com/@make_it)
