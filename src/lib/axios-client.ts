import axios from "axios";

/** Axios instance untuk pemakaian client-side (baseURL /api). */
const apiClient = axios.create({
  baseURL: "/api",
  timeout: 20000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ??
      (error.code === "ERR_NETWORK" ? "Terjadi kesalahan jaringan, periksa koneksimu" : error.message);
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
