import { render } from 'preact'
import { App } from './app.jsx'
import './index.scss'

// Ensure body has the same class as html for consistency
const htmlClass = document.documentElement.className;
if (htmlClass) {
  document.body.className = htmlClass;
}

render(<App />, document.getElementById('app'))
