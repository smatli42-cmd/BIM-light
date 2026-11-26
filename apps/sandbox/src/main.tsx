import { render } from 'preact';
import { App } from './app/App.tsx';
import { Gallery } from './gallery/Gallery.tsx';
import './styles/theme.css';
import './styles/layout.css';
import './styles/controls.css';
import './styles/panels.css';
import './styles/floating.css';
import './styles/infobox-content.css';
import './styles/find-bar.css';
import './styles/lessons.css';
import './styles/schedule.css';
import './styles/type-editor.css';
import './styles/samples.css';

const root = document.getElementById('app');
// Galerie napojení stěn (plán stěn Z2): adresa …/BIM-light/#galerie.
if (root) render(location.hash === '#galerie' ? <Gallery /> : <App />, root);
window.addEventListener('hashchange', () => location.reload());
