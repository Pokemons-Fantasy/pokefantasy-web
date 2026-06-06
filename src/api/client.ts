import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://pokefantasy.onrender.com';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});
