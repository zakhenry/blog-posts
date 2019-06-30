import { fuzzySubstringSimilarity } from '../src/app/book-search/common/fuzzy-substring';

const similarity = fuzzySubstringSimilarity(
  'were all madd her',
  '‘Oh, you can’t help that,’ said the Cat: ‘we’re all mad here. I’m mad. You’re mad.’',
);
console.log(`Similarity: `, similarity);
