# Zak Henry's Blog Source

https://dev.to/zakhenry

## Posts/Ideas
* Observable Workers in Angular
  * ✅ [Part 1 - Intro](posts/observable-workers/post.md)
  * ✅ [Part 2 - Real world usage of Observable worker](https://dev.to/zakhenry/observable-web-workers-a-deep-dive-into-a-realistic-use-case-4042) - full text search on books from [Project Gutenberg](https://www.gutenberg.org/)
  * [Part 3 - Parallel computation in the browser with observable worker pool](https://dev.to/zakhenry/improving-performance-of-observable-web-workers-with-thread-pools-4392)
  * 💡Part 4 - Transferable objects for high performance workers - [Floyd–Steinberg dithering](https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering) 
* Embedme
  * ✅[Introduction](posts/embedme/post.md)
* 💡Complex Typescript types:
```ts
interface Foo {
  stringVal: string;
  arrayVal: string[];
   
  arrayVal2: string[];
}

type KeysWithType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never
}[keyof T];

type ArrayPropertyOf<T> = KeysWithType<T, Array<any>>;

const foo: ArrayPropertyOf<Foo> = 'stringVal'; 
``` 
