import assert from 'node:assert/strict';
import { isSafeProjectImage, projectEvidenceImages, resolveParentProjectImage } from './parentProjectVisual.ts';

assert.equal(resolveParentProjectImage({
  thumbnailUrl: 'https://cdn.example.test/thumbnail.webp',
  coverImage: 'https://cdn.example.test/cover.webp',
  gallery: ['https://cdn.example.test/gallery.webp']
}, 'https://cdn.example.test/template.webp'), 'https://cdn.example.test/thumbnail.webp');

assert.equal(resolveParentProjectImage({
  gallery: ['javascript:alert(1)', '/learner-proof.png'],
  mediaUrls: ['/learner-proof.png', 'data:text/html,unsafe']
}, 'https://cdn.example.test/template.webp'), '/learner-proof.png');

assert.equal(resolveParentProjectImage({}, '/template-cover.svg'), '/template-cover.svg');
assert.deepEqual(projectEvidenceImages({ gallery: ['/one.png'], mediaUrls: ['/one.png', 'https://cdn.example.test/two.jpg'] }), [
  '/one.png', 'https://cdn.example.test/two.jpg'
]);
assert.equal(isSafeProjectImage('javascript:alert(1)'), false);

console.log('parent project visual resolver: 5 checks passed');
