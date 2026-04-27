import axios from 'axios';
import { getApiBase } from '../utils/apiBase';

const api = axios.create({
  baseURL: getApiBase(),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export default api;
