import './app.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

import { mount } from 'svelte';

import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
