// Render the real access component with isolated account boundaries. No Firebase calls.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const componentPath = fileURLToPath(new URL('./RecipientQuickAccess.tsx', import.meta.url));
const output = await build({
  entryPoints: [componentPath],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  plugins: [{
    name: 'isolated-account-boundaries',
    setup(builder) {
      builder.onResolve({ filter: /(?:context\/(?:AuthContext|ConfirmContext)|services\/recipientQuickAccess|utils\/config)$/ }, args => ({ path: args.path, namespace: 'account-smoke' }));
      builder.onLoad({ filter: /.*/, namespace: 'account-smoke' }, args => ({
        contents: args.path.endsWith('AuthContext')
          ? "export const useAuth = () => ({ currentOrganization: { id: 'org-test' }, userProfile: { role: 'admin' } });"
          : args.path.endsWith('ConfirmContext')
            ? 'export const useConfirm = () => ({ alert: async () => {} });'
            : args.path.endsWith('recipientQuickAccess')
              ? "export const issueRecipientQuickLink = async () => ({ launchUrl: 'https://sparkquest.test/?launch=test', expiresAt: new Date(Date.now() + 300000).toISOString() });"
              : "export const config = { sparkQuestUrl: 'https://sparkquest.test/' };",
        loader: 'js',
      }));
    },
  }],
});

const componentModule = { exports: {} };
new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, componentModule, componentModule.exports);
const { RecipientQuickAccess } = componentModule.exports;
const student = {
  id: 'learner-test',
  name: 'Test Learner',
  organizationId: 'org-test',
  loginInfo: { uid: 'learner-uid', email: 'learner@makerlab.academy' },
  parentLoginInfo: { uid: 'parent-uid', email: 'p.family@makerlab.academy' },
};

for (const role of ['parent', 'student']) {
  const markup = renderToStaticMarkup(React.createElement(RecipientQuickAccess, { student, role }));
  assert.match(markup, /Manual link &amp; QR/);
  assert.match(markup, /One-click access/);
  assert.doesNotMatch(markup, /Single-use link, expires/);
}

console.log('Recipient quick access initial render: parent and learner controls visible without a link');
