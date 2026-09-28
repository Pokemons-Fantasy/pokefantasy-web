import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { resolveApiBaseUrl } from '../utils/apiBaseUrl';

export const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_URL, Capacitor.isNativePlatform());

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});
