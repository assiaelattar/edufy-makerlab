import assert from 'node:assert/strict';
import { parseCsvRows, parseResourceQuizCsv, resourceQuizCsvTemplate } from './resourceQuizCsv.ts';

assert.deepEqual(parseCsvRows('a,b\n"one, two","quote ""inside"""'), [['a', 'b'], ['one, two', 'quote "inside"']]);
const templateQuestions = parseResourceQuizCsv(resourceQuizCsvTemplate);
assert.equal(templateQuestions.length, 2);
assert.equal(templateQuestions[0].correctOptionIndex, 0);
assert.equal(templateQuestions[1].correctOptionIndex, 1);
assert.equal(parseResourceQuizCsv('question,option_a,option_b,correct_option\nPick one,First,Second,Second')[0].correctOptionIndex, 1);
assert.equal(parseResourceQuizCsv('question_id,question,option_a,option_b,correct_option\nsame,Q1,A,B,A\nsame,Q2,A,B,2')[1].id, 'same-2');
assert.throws(() => parseResourceQuizCsv('question,option_a\nBroken,One'), /Missing CSV columns/);
assert.throws(() => parseResourceQuizCsv('question,option_a,option_b,correct_option\nBroken,One,Two,D'), /Row 2/);
assert.throws(() => parseCsvRows('a,"broken'), /unclosed/);
console.log('resourceQuizCsv.smoke: 10 assertions passed');
