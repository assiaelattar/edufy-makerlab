import React from 'react';
import { createRoot } from 'react-dom/client';
import { FactoryLearningDemo } from './FactoryLearningDemo';
import './factory-learning-demo.css';
import './factory-learning-energy.css';

createRoot(document.getElementById('factory-learning-demo')!).render(
  <React.StrictMode><FactoryLearningDemo /></React.StrictMode>,
);
