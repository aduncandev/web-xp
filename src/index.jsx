import React from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import './WinXP/theme/luna.css';
import './WinXP/theme/classic.css';
import 'assets/clear.css';
import 'assets/font.css';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
