
import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isPublicEnrollmentRequest } from './utils/publicEnrollment';

const App = lazy(() => import('./App'));
const PublicEnrollmentView = lazy(() => import('./views/PublicEnrollmentView').then(module => ({
  default: module.PublicEnrollmentView
})));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const entryView = isPublicEnrollmentRequest()
  ? <PublicEnrollmentView />
  : <App />;

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={null}>
        {entryView}
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);
