import assert from 'node:assert/strict';
import { parentImageSources } from './parentImage.ts';

const host = 'sparkquest-makerlab.vercel.app';
const local = parentImageSources('/covers/robot.jpg', host);
assert.ok(local);
assert.match(local.src, /w=640&q=65$/);
assert.match(local.srcSet, /320w.*640w.*960w/);

const firebase = parentImageSources('https://firebasestorage.googleapis.com/v0/b/edufy-makerlab.firebasestorage.app/o/projects%2Fcover.jpg?alt=media&token=example', host);
assert.ok(firebase);
assert.match(firebase.src, /_vercel\/image\?url=/);
assert.ok(parentImageSources('https://firebasestorage.googleapis.com/v0/b/edufy-makerlab.firebasestorage.app/o/projects%2Fimage_123?alt=media&token=example', host));

for (const source of [
  '/mission-plant-guardian.svg',
  'https://other.example.com/huge.jpg',
  'https://firebasestorage.googleapis.com/v0/b/other-bucket/o/private.jpg?token=example',
  'data:image/jpeg;base64,abc',
  'http://firebasestorage.googleapis.com/v0/b/edufy-makerlab.firebasestorage.app/o/cover.jpg'
]) assert.equal(parentImageSources(source, host), null);
assert.equal(parentImageSources('/covers/robot.jpg', 'localhost'), null);
console.log('Parent image source checks passed.');
