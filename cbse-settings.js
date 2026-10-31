const $ = id => document.getElementById(id);
let auth, authApi, user = null, verified = false, busy = false;
let generation = 0;
function message(text, type = '') {
  $('settings-message').textContent = text;
  $('settings-message').className = `notice ${type}`;
}
function errorText(error) {
  const code = String(error.code || '').toLowerCase();
  if (['invalid-credential', 'wrong-password', 'invalid-login-credentials'].some(s => code.includes(s))) return 'The old password is incorrect. Please try again.';
  if (code.includes('weak-password') || code.includes('password-does-not-meet-requirements')) return 'Choose a new password that meets the school account’s password requirements.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Please wait before trying again.';
  if (code.includes('network')) return 'Connection failed. Your password change was not confirmed. Please try again.';
  if (code.includes('requires-recent-login') || code.includes('user-token-expired') || code.includes('invalid-user-token')) return 'Your session has expired. Sign in again before changing your password.';
  if (code.includes('permission')) return 'This account does not have access to Principal settings.';
  return error.message || 'The password could not be changed. Please try again.';
}
function lock() {
  verified = false;
  $('settings-panel').hidden = true;
  $('settings-locked').hidden = false;
  $('password-form').reset();
}
$('password-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !verified || !user) return;
  const oldPassword = $('old-password').value;
  const newPassword = $('new-password').value;
  if (newPassword !== $('confirm-password').value) {
    message('New password and confirmation do not match.', 'error'); return;
  }
  if (newPassword.length < 6) {
    message('Your new password must have at least 6 characters.', 'error'); return;
  }
  if (newPassword === oldPassword) {
    message('Choose a new password different from your old password.', 'error'); return;
  }
  const current = user;
  busy = true;
  document.documentElement.dataset.portalBusy='true';
  $('change-password').disabled = true;
  message('Verifying your old password…');
  try {
    const credential = authApi.EmailAuthProvider.credential(current.email, oldPassword);
    await authApi.reauthenticateWithCredential(current, credential);
    if (!verified || user?.uid !== current.uid) throw Error('Your session changed. Sign in again before continuing.');
    await authApi.updatePassword(current, newPassword);
    $('password-form').reset();
    message('Password changed successfully. You remain signed in.', 'success');
  } catch (error) {
    $('old-password').value = '';
    message(errorText(error), 'error');
  } finally {
    busy = false;
    document.documentElement.dataset.portalBusy='false';
    $('change-password').disabled = false;
  }
});
try {
  const [client, authentication, database] = await Promise.all([
    import('./firebase-client.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js')
  ]);
  auth = client.auth;
  authApi = authentication;
  authApi.onAuthStateChanged(auth, async current => {
    const token = ++generation;
    user = current;
    lock();
    if (!current) {
      message('Sign in to the portal before opening Password Settings.');
      return;
    }
    $('settings-locked').hidden = true;
    message('Checking Principal access…');
    try {
      const principal = await database.get(database.ref(client.db, 'cbse/adminUid'));
      if (token !== generation) return;
      if (principal.val() !== current.uid) throw Error('This account does not have access to Principal settings.');
      verified = true;
      $('settings-panel').hidden = false;
      message('Enter your old password and new password below.');
    } catch (error) {
      if (token !== generation) return;
      lock(); message(errorText(error), 'error');
    }
  });
} catch {
  lock(); message('Secure settings could not load. Check your connection and try again.', 'error');
}
