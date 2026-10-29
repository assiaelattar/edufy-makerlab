import React from 'react';
import { createRoot } from 'react-dom/client';
import { LandingView } from '../../views/website/LandingView';

// Synthetic, read-only fixture for the public landing experience.
// It does not initialize Firebase, authentication or school data.
createRoot(document.getElementById('root')).render(<LandingView />);
