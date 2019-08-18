---
title: Parallel Computation in the Browser with Observable Webworkers
cover_image: ./article/max-vertsanov-qvRuue12Huw-unsplash.jpg
published: false
description: Improve upon the performance of a single webworker with multiple parallel webworkers.
tags: web worker, observable, rxjs, angular
series: observable-webworkers
id: 132596
---

In the [previous article](https://dev.to/zakhenry/observable-web-workers-a-deep-dive-into-a-realistic-use-case-4042) we dove deep.



```
file-1.txt  ^~~~~~~~|
file-2.txt  ^~~~|
file-3.txt  ^~~~~~~~~~~|
file-4.txt  ----^~~~~~~~~~|
file-5.txt  --------^~~~~~~~~~|
file-6.txt  -----------^~~~~|
main thread ^---2---1--3--4-6-(5|)
```

```
file-1.txt  ^~~~~~~~|
file-2.txt  --------^~~~|
file-3.txt  ------------^~~~~~~~~~~|
file-4.txt  -----------------------^~~~~~~~~~|
file-5.txt  ---------------------------------^~~~~~~~~~|
file-6.txt  -------------------------------------------^~~~~|
main thread --------1---2----------3---------4---------5----(6|)
```

[<sub>Photo by Max Vertsanov on Unsplash</sub>](https://unsplash.com/@make_it)
