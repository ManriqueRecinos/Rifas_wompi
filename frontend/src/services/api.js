import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: (correo, contrasenia) => api.post('/auth/login', { correo, contrasenia }),
  register: (userData) => api.post('/auth/register', userData),
};

export const raffleService = {
  getAll: () => api.get('/rifas'),
  getOne: (id) => api.get('/rifas/' + id),
  create: (data) => api.post('/rifas', data),
  getWinner: (id) => api.get(`/rifas/${id}/ganador`),
  selectWinner: (id) => api.post(`/rifas/${id}/sorteo`),
};

export const paymentService = {
  createOrder: (data) => api.post('/pagos/crear', data),
};

export default api;
