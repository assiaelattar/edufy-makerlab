import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the current StudentDetailsView handler against an atomic Firestore batch
// stand-in. The handler body is parsed from source so this does not duplicate it.
const source = readFileSync(new URL('../StudentDetailsView.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('StudentDetailsView.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const findHandler = node => {
  if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'handleSavePayment') return node.initializer;
  return ts.forEachChild(node, findHandler);
};
const initializer = findHandler(file);
assert.ok(initializer, 'Student Details payment save handler exists');
const compiled = ts.transpileModule(`module.exports = ${initializer.getText(file)};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
}).outputText;

const makeHarness = ({ failFirstCommit = false, holdCommit = false, method = 'cash', amount = 120 } = {}) => {
  const records = {
    payments: { p1: { id: 'p1', enrollmentId: 'e1', amount: 100, method: 'cash', status: 'paid' } },
    enrollments: { e1: { id: 'e1', paidAmount: 100, balance: 900 } }
  };
  const draft = {
    ...records.payments.p1,
    amount,
    method,
    ...(method === 'virement' ? { proofUrl: 'synthetic-proof' } : {}),
    ...(method === 'check' ? { checkNumber: 'CHK-1', bankName: 'Example Bank' } : {})
  };
  const alerts = [];
  const commits = [];
  let releaseCommit;
  let error = '';
  let busy = false;
  const apply = operations => {
    for (const { ref, patch } of operations) {
      const record = records[ref.collection][ref.id];
      assert.ok(record, `batch target ${ref.collection}/${ref.id} exists`);
      for (const [key, value] of Object.entries(patch)) {
        record[key] = value?.incrementBy === undefined ? value : Number(record[key] || 0) + value.incrementBy;
      }
    }
  };
  const context = {
    module: { exports: undefined },
    db: {},
    isUploadingPaymentProof: false,
    editPayment: draft,
    payments: [records.payments.p1],
    enrollments: [records.enrollments.e1],
    paymentSaveLock: { current: false },
    setIsSavingPayment: value => { busy = value; },
    setPaymentSaveError: value => { error = value; },
    setEditPayment: value => { context.editPayment = value; },
    showAlert: async (...args) => { alerts.push(args); },
    doc: (_db, collection, id) => ({ collection, id }),
    increment: incrementBy => ({ incrementBy }),
    writeBatch: db => {
      assert.equal(db, context.db);
      const operations = [];
      return {
        update(ref, patch) { operations.push({ ref, patch }); },
        commit() {
          commits.push(operations);
          if (failFirstCommit) {
            failFirstCommit = false;
            return Promise.reject(new Error('synthetic commit failure'));
          }
          if (holdCommit) return new Promise(resolve => { releaseCommit = () => { apply(operations); resolve(); }; });
          apply(operations);
          return Promise.resolve();
        }
      };
    },
    console: { error() {} }
  };
  vm.runInNewContext(compiled, context, { filename: 'handleSavePayment.js' });
  const submit = () => context.module.exports({ preventDefault() {} });
  return { records, alerts, commits, context, submit, release: () => releaseCommit?.(), get error() { return error; }, get busy() { return busy; } };
};

{
  const h = makeHarness();
  await h.submit();
  assert.equal(h.commits.length, 1);
  assert.equal(h.commits[0].length, 2, 'one batch contains payment and enrollment updates');
  assert.equal(h.commits[0][0].ref.collection, 'payments');
  assert.equal(h.commits[0][1].ref.collection, 'enrollments');
  assert.equal(h.records.payments.p1.amount, 120);
  assert.equal(h.records.enrollments.e1.paidAmount, 120);
  assert.equal(h.records.enrollments.e1.balance, 880);
  assert.equal(h.context.editPayment, null);
  assert.equal(h.busy, false);
}

{
  const h = makeHarness({ failFirstCommit: true });
  await h.submit();
  assert.equal(h.commits.length, 1);
  assert.equal(h.records.payments.p1.amount, 100, 'failed commit leaves payment unchanged');
  assert.equal(h.records.enrollments.e1.balance, 900, 'failed commit leaves balance unchanged');
  assert.equal(h.context.editPayment.amount, 120, 'draft survives failure');
  assert.match(h.error, /not saved/i);
  assert.equal(h.context.paymentSaveLock.current, false, 'failed commit unlocks retry');
  await h.submit();
  assert.equal(h.commits.length, 2);
  assert.equal(h.records.payments.p1.amount, 120);
  assert.equal(h.records.enrollments.e1.balance, 880);
}

{
  const h = makeHarness({ method: 'virement' });
  await h.submit();
  assert.equal(h.commits.length, 1);
  assert.equal(h.commits[0].length, 2);
  assert.equal(h.records.payments.p1.status, 'pending_verification');
  assert.equal(h.records.enrollments.e1.paidAmount, 0, 'moving a cleared payment to pending removes its cleared amount');
  assert.equal(h.records.enrollments.e1.balance, 1000);
}

{
  const h = makeHarness({ holdCommit: true });
  const first = h.submit();
  const duplicate = h.submit();
  await duplicate;
  assert.equal(h.commits.length, 1, 'duplicate submit cannot start another batch');
  assert.equal(h.busy, true);
  h.release();
  await first;
  assert.equal(h.records.enrollments.e1.balance, 880);
  assert.equal(h.busy, false);
}

console.log('Student Details payment edit: atomic two-record batch, failed-commit retry, and duplicate-submit guard passed.');
