import React from 'react';
import { createRoot } from 'react-dom/client';
import ReviewExperience from './components/review-experience/ReviewExperience';
import './components/review-experience/review-experience.css';

const root = document.getElementById('root');
const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
if (root && import.meta.env.DEV && local) createRoot(root).render(<ReviewExperience />);
else if (root) root.textContent = 'This synthetic preview is available only on a local development server.';
