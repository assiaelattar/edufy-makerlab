import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contextPath = path.join(root, 'ATLAS_BUILD_CONTEXT.md');

if (!fs.existsSync(contextPath)) {
  console.error('ATLAS_BUILD_CONTEXT.md was not found. Create it before running the Atlas loop.');
  process.exit(1);
}

const context = fs.readFileSync(contextPath, 'utf8');

function section(title) {
  const pattern = new RegExp(`^## ${escapeRegExp(title)}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'm');
  const match = context.match(pattern);
  return match ? match[1].trim() : '';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function firstUncheckedListItem(markdown) {
  const match = markdown.match(/^- \[ \] (.+)$/m);
  return match ? match[1].trim() : null;
}

function listItems(markdown, max = 6) {
  return markdown
    .split(/\r?\n/)
    .filter(line => /^- /.test(line.trim()))
    .slice(0, max)
    .map(line => line.trim());
}

function checkedItems(markdown, max = 4) {
  return markdown
    .split(/\r?\n/)
    .filter(line => /^- \[x\]/i.test(line.trim()))
    .slice(0, max)
    .map(line => line.trim());
}

function uncheckedItems(markdown, max = 8) {
  return markdown
    .split(/\r?\n/)
    .filter(line => /^- \[ \]/.test(line.trim()))
    .slice(0, max)
    .map(line => line.trim());
}

const nextLoop = section('Immediate Next Loop');
const risks = section('Known Cross-Cutting Risks');
const verification = section('Verification Log');
const latestWork = section('Latest Completed Work');
const nextModuleMatch = nextLoop.match(/Recommended next module:\s*(.+)\./);
const nextModule = nextModuleMatch ? nextModuleMatch[1].trim() : 'Not specified';
const firstTask = firstUncheckedListItem(nextLoop);
const checklist = uncheckedItems(nextLoop);
const riskItems = listItems(risks, 7);
const verificationItems = listItems(verification, 5);
const latestItems = checkedItems(context, 6);

console.log('\nAtlas Loop Agent');
console.log('================\n');
console.log(`Context: ${path.relative(root, contextPath)}`);
console.log(`Next module: ${nextModule}`);
if (firstTask) console.log(`First task: ${firstTask}`);

console.log('\nTarget Checklist');
console.log('----------------');
if (checklist.length) {
  checklist.forEach(item => console.log(item));
} else {
  console.log('No unchecked target checklist items found.');
}

console.log('\nKnown Risks');
console.log('-----------');
if (riskItems.length) {
  riskItems.forEach(item => console.log(item));
} else {
  console.log('No risks listed.');
}

console.log('\nVerification Log');
console.log('----------------');
if (verificationItems.length) {
  verificationItems.forEach(item => console.log(item));
} else {
  console.log('No verification log listed.');
}

console.log('\nRecent Completed Signals');
console.log('------------------------');
if (latestItems.length) {
  latestItems.forEach(item => console.log(item));
} else {
  console.log('No checked completed items found.');
}

console.log('\nProtocol');
console.log('--------');
console.log('Read context -> inspect module -> build -> run npm.cmd run build -> update ATLAS_BUILD_CONTEXT.md -> report.\n');
