import api from "@/lib/axios";
import type { AxiosRequestConfig } from "axios";

export const authService = {
  signUp: async (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string
  ) => {
    const res = await api.post(
      "/auth/signup",
      { username, password, email, firstName, lastName },
      { withCredentials: true }
    );

    return res.data;
  },

  signIn: async (username: string, password: string) => {
    const res = await api.post(
      "/auth/signin",
      { username, password },
      { withCredentials: true }
    );
    return res.data; // { message, accessToken, user }
  },

  signOut: async () => {
    return api.post("/auth/signout", undefined, { withCredentials: true });
  },

  fetchMe: async (accessToken?: string) => {
    const config: AxiosRequestConfig = {
      withCredentials: true,
    };

    if (accessToken) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      };
    }

    const res = await api.get("/users/me", config);
    return res.data.user;
  },

  refresh: async () => {
    const res = await api.post("/auth/refresh", undefined, { withCredentials: true });
    return res.data; // { accessToken, user }
  },

  forgotPassword: async (identifier: string) => {
    const res = await api.post(
      "/auth/forgot-password",
      { identifier },
      { withCredentials: true }
    );
    return res.data; // { message }
  },

  resetPassword: async (token: string, newPassword: string) => {
    const res = await api.post(
      "/auth/reset-password",
      { token, newPassword },
      { withCredentials: true }
    );
    return res.data; // { message }
  },
};