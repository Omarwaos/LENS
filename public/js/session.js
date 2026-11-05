export async function request(path, method = 'GET', body) {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || 'No se pudo completar la operación.');
    error.status = response.status;
    throw error;
  }
  return result;
}

export function homeFor(user) {
  return user.nivel_acceso === 'ADMIN' ? '/' : '/mis-eventos.html';
}

export function redirectIfSignedOut(error) {
  if (error.status !== 401) return false;
  location.replace('/login.html');
  return true;
}

export function bindLogout(button, showError) {
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await request('auth/logout', 'POST');
      location.replace('/login.html');
    } catch (error) {
      showError(error.message);
      button.disabled = false;
    }
  });
}
