import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    config.headers['x-client-date'] = `${year}-${month}-${day}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/api/auth/refresh');
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  logout: () => api.post('/api/auth/logout'),
  refresh: () => api.post('/api/auth/refresh'),
  getMe: () => api.get('/api/auth/me'),
  updateProfile: (data) => api.put('/api/auth/profile', data),
  deleteAccount: () => api.delete('/api/auth/account'),
};

// Task API
export const taskAPI = {
  getTasks: (params) => api.get('/api/tasks', { params }),
  getAllTasks: () => api.get('/api/tasks/all'),
  getTaskById: (id) => api.get(`/api/tasks/${id}`),
  getSummary: () => api.get('/api/tasks/summary'),
  createTask: (data) => api.post('/api/tasks', data),
  updateTask: (id, data) => api.put(`/api/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/api/tasks/${id}`),
  completeTask: (id) => api.patch(`/api/tasks/${id}/complete`),
  completeOccurrence: (id, date, increment, clear) => api.patch(`/api/tasks/${id}/complete/${date}`, {}, { params: { increment, clear } }),
  skipOccurrence: (id, date) => api.patch(`/api/tasks/${id}/skip/${date}`),
  bulkAction: (data) => api.patch('/api/tasks/bulk', data),
  reorderTasks: (orderedIds) => api.patch('/api/tasks/reorder', { orderedIds }),
};

// Category API
export const categoryAPI = {
  getCategories: () => api.get('/api/categories'),
  createCategory: (data) => api.post('/api/categories', data),
  updateCategory: (id, data) => api.put(`/api/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/api/categories/${id}`),
};

export default api;
