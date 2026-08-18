const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
};

// Reads a response body defensively: a 204 No Content has no body and
// response.json() would throw on it.
export const readJson = async (response) => {
  if (response.status === 204) {
    return {};
  }

  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};
