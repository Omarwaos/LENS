import { homeFor, request } from './session.js';

const form = document.querySelector('#login-form');
const errorText = document.querySelector('#login-error');
const submit = form.querySelector('button');

async function enter() {
  location.replace(homeFor(await request('auth/me')));
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  submit.disabled = true;
  errorText.textContent = '';
  try {
    await request('auth/login', 'POST', Object.fromEntries(new FormData(form)));
    await enter();
  } catch (error) {
    errorText.textContent = error.message;
    submit.disabled = false;
  }
});

enter().catch(error => {
  if (error.status !== 401) errorText.textContent = 'No se pudo comprobar la sesión.';
});
