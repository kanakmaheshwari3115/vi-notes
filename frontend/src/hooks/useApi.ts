const BASE_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : '/api';
  
const getToken = (): string | null => localStorage.getItem('token');

const headers = (withAuth = true): HeadersInit => {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (withAuth) {
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
  }
  return h;
};

const handleResponse = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
};

export const api = {
  register: (email: string, password: string) =>
    fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: headers(false),
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  login: (email: string, password: string) =>
    fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: headers(false),
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  getMe: () =>
    fetch(`${BASE_URL}/auth/me`, { headers: headers() }).then(handleResponse),

  getSessions: () =>
    fetch(`${BASE_URL}/sessions`, { headers: headers() }).then(handleResponse),

  getSession: (id: string) =>
    fetch(`${BASE_URL}/sessions/${id}`, { headers: headers() }).then(handleResponse),

  createSession: (title: string) =>
    fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ title }),
    }).then(handleResponse),

  updateSession: (id: string, data: { title?: string; content?: string }) =>
    fetch(`${BASE_URL}/sessions/${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  deleteSession: (id: string) =>
    fetch(`${BASE_URL}/sessions/${id}`, {
      method: 'DELETE',
      headers: headers(),
    }).then(handleResponse),

  // Behavior Data
  saveBehavior: (
    sessionId: string,
    data: {
      keystrokes: {
        holdDuration: number;
        timestamp: number;
        keyCategory: string;
      }[];
      pasteEvents: {
        timestamp: number;
        characterCount: number;
        wordCount: number;
      }[];
    }
  ) =>
    fetch(`${BASE_URL}/behavior/${sessionId}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    }).then(handleResponse),
};