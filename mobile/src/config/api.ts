import axios from "axios";

// Determine API URLs based on environment variables
const baseURL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || "ws://localhost:8080/ws/kds";
export const AI_URL = process.env.EXPO_PUBLIC_AI_URL || "http://localhost:8000/api/v1/ai";
