import { createAuthClient } from 'better-auth/react';
//import { API_BASE_URL } from './api';

const isLocalhost = window.location.hostname === "localhost";

export const authClient = createAuthClient({
  baseURL: isLocalhost
  ?   "http://localhost:3000" 
    : "https://breakfast-order-system.onrender.com"
});
