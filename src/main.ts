import './styles/global.css';
import { mountApp } from './router';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('main.ts: #app root element not found');
}

mountApp(root);
