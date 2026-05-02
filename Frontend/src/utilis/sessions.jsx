export const getSession = () => {
  const raw = localStorage.getItem('pharmax_user');
  return raw ? JSON.parse(raw) : null;
};

export const getUserId = () => getSession()?.userId || null;
export const getUsername = () => getSession()?.username || null;
