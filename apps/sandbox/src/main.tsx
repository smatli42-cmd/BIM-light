import { render } from 'preact';
import { App } from './app/App.tsx';
import { Gallery } from './gallery/Gallery.tsx';
import './styles.css';

const root = document.getElementById('app');
// Galerie napojení stěn (plán stěn Z2): adresa …/BIM-light/#galerie.
if (root) render(location.hash === '#galerie' ? <Gallery /> : <App />, root);
window.addEventListener('hashchange', () => location.reload());
