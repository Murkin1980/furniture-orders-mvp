export function checkAuth(authHeader, config) {
  if (!authHeader) {
    return { authorized: false };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { authorized: false };
  }

  const token = parts[1];
  if (token !== config.token) {
    return { authorized: false };
  }

  return { authorized: true };
}
