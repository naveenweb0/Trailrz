import axios, { AxiosInstance } from "axios";
import { useMemo } from "react";
import { API } from "@/lib/api";

export function useStaffApi(): AxiosInstance {
  return useMemo(() => {
    const i = axios.create({ baseURL: API });
    i.interceptors.request.use(async (c) => {
      let token = "";
      if (typeof window !== "undefined") {
        try {
          token = localStorage.getItem("trz_staff_token") || "";
        } catch {}
      }
      if (token) {
        c.headers.Authorization = `Bearer ${token}`;
      }
      return c;
    });
    return i;
  }, []);
}
