const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Custom fetch client wrapper to auto-inject Bearer tokens and handle 401 invalidations.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("quiz_auth_token");
  
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  // Set default JSON Content-Type if body is present and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle cross-origin token expiration / invalidation (401 redirects)
  if (res.status === 401) {
    localStorage.removeItem("quiz_auth_token");
    localStorage.removeItem("quiz_auth_user");
    
    // Redirect to login page and abort execution
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
  }

  return res;
}
