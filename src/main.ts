import '@fontsource-variable/anek-latin/standard.css'; // weight and width axes
import '@fontsource-variable/bodoni-moda/opsz.css'; // weight and optical-size axes, roman only
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/home.css';
import './styles/pages.css';
import { initNav } from './shell/nav';
import { initReveal } from './shell/reveal';

initNav();
initReveal();

const page = document.body.dataset.page;
if (page === 'home') import('./pages/home').then((m) => m.initHome());
if (page === 'work') import('./pages/work').then((m) => m.initWork());
if (page === 'project') import('./pages/project').then((m) => m.initProject());
if (page === 'contact') import('./pages/contact').then((m) => m.initContact());
