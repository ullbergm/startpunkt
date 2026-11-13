import { render } from 'preact';
import { App } from './components/App';
import '@fontsource/caveat/latin-400.css';
import '@fontsource/caveat/latin-700.css';
import './kit.css';
import './style.css';

render(<App />, document.getElementById('app')!);
