import axios from "axios";

// Determine API URL based on environment variables
const baseURL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8080/api/v1";

export const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || "ws://10.0.2.2:8080/ws/kds";
