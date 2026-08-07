async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}
export const api = {
  login: (username, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request("/api/me"),
  changePassword: (data) =>
    request("/api/me/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  bootstrap: () => request("/api/bootstrap"),
  search: (query) => request(`/api/search?q=${encodeURIComponent(query)}`),
  createGate: (data) =>
    request("/api/gates", { method: "POST", body: JSON.stringify(data) }),
  updateGate: (id, data) =>
    request(`/api/gates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteGate: (id) => request(`/api/gates/${id}`, { method: "DELETE" }),
  approveGate: (id) => request(`/api/gates/${id}/approve`, { method: "POST" }),
  createLock: (data) =>
    request("/api/locks", { method: "POST", body: JSON.stringify(data) }),
  updateLock: (id, data) =>
    request(`/api/locks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteLock: (id) => request(`/api/locks/${id}`, { method: "DELETE" }),
  approveLock: (id) => request(`/api/locks/${id}/approve`, { method: "POST" }),
  createUser: (data) =>
    request("/api/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id, data) =>
    request(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  createPositionTitle: (name) =>
    request("/api/position-titles", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  updatePositionTitle: (id, name) =>
    request(`/api/position-titles/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),
  messages: (after = 0) => request(`/api/messages?after=${after}`),
  sendMessage: (data) =>
    request("/api/messages", { method: "POST", body: JSON.stringify(data) }),
  uploadMessagePhoto: async (messageId, file) => {
    const response = await fetch(`/api/messages/${messageId}/photos`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": file.type,
        "X-File-Name": encodeURIComponent(file.name || "photo"),
      },
      body: file,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Photo upload failed");
    return body;
  },
  broadcasts: () => request("/api/broadcasts"),
  createBroadcast: (data) =>
    request("/api/broadcasts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  readBroadcast: (id) =>
    request(`/api/broadcasts/${id}/read`, { method: "POST" }),
  calculatorState: () => request("/api/calculators/state"),
  toggleCalculatorFavorite: (type) =>
    request(`/api/calculators/favorites/${type}`, { method: "POST" }),
  markCalculatorRecent: (type) =>
    request(`/api/calculators/recent/${type}`, { method: "POST" }),
  saveCalculation: (data) =>
    request("/api/calculators/saved", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateSavedCalculation: (id, data) =>
    request(`/api/calculators/saved/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteSavedCalculation: (id) =>
    request(`/api/calculators/saved/${id}`, { method: "DELETE" }),
  updateCalculatorConfig: (key, value) =>
    request(`/api/calculators/config/${key}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    }),
  restoreCalculatorConfig: (key) =>
    request(`/api/calculators/config/${key}`, { method: "DELETE" }),
  files: () => request("/api/files"),
  uploadFile: async (file, title, notes) => {
    const response = await fetch("/api/files", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
        "X-File-Title": encodeURIComponent(title),
        "X-File-Notes": encodeURIComponent(notes || ""),
      },
      body: file,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Upload failed");
    return body;
  },
  updateFile: (id, data) =>
    request(`/api/files/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteFile: (id) => request(`/api/files/${id}`, { method: "DELETE" }),
  links: () => request("/api/links"),
  createLink: (data) =>
    request("/api/links", { method: "POST", body: JSON.stringify(data) }),
  updateLink: (id, data) =>
    request(`/api/links/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteLink: (id) => request(`/api/links/${id}`, { method: "DELETE" }),
  forms: () => request("/api/forms"),
  createForm: (data) =>
    request("/api/forms", { method: "POST", body: JSON.stringify(data) }),
  updateForm: (id, data) =>
    request(`/api/forms/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteForm: (id) => request(`/api/forms/${id}`, { method: "DELETE" }),
  formSubmissions: (id) => request(`/api/forms/${id}/submissions`),
  submitForm: (id, values) =>
    request(`/api/forms/${id}/submissions`, {
      method: "POST",
      body: JSON.stringify({ values }),
    }),
};
