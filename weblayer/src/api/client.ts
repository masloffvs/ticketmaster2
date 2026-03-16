import axios from "axios";

export const apiClient = axios.create({
  baseURL: "http://localhost:3000",
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});
