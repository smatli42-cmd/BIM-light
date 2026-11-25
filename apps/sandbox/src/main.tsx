import { render } from 'preact';
import { App } from './app/App.tsx';
import { Gallery } from './gallery/Gallery.tsx';
import './styles/theme.css';
import './styles/layout.css';
import './styles/controls.css';
import './styles/panels.css';

const root = document.getElementById('app');
// Galerie napojení stěn (plán stěn Z2): adresa …/BIM-light/#galerie.
if (root) render(location.hash === '#galerie' ? <Gallery /> : <App />, root);
window.addEventListener('hashchange', () => location.reload());
