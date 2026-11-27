import axios, { AxiosInstance } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

export const API = "/api";
export const api: AxiosInstance = axios.create({ baseURL: API, timeout: 15000 });

export function errMsg(e: any, fallback = "Something went wrong. Please try again."): string {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x: any) => x.msg?.replace("Value error, ", "")).join(". ");
  if (e?.code === "ECONNABORTED" || e?.message?.toLowerCase().includes("timeout")) {
    return "The request took too long. Please check your connection and try again.";
  }
  if (e?.message === "Network Error") return "We couldn't reach TRAILRZ. Check your connection.";
  if (typeof e?.message === "string" && e.message && !e.response) return e.message;
  return fallback;
}


export function useLoad<T = any>(fn: () => Promise<T>, deps: any[] = []) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({
    data: null,
    loading: true,
    error: null,
  });
  const reqIdRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  const reload = useCallback(async () => {
    const id = ++reqIdRef.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await run();
      if (!mountedRef.current || id !== reqIdRef.current) return;
      setState({ data, loading: false, error: null });
    } catch (e) {
      if (!mountedRef.current || id !== reqIdRef.current) return;
      setState({ data: null, loading: false, error: errMsg(e) });
    }
  }, [run]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { ...state, reload, setData: (data: T | null) => setState((s) => ({ ...s, data })) };
}

const TZ = "Asia/Kolkata";
export const inr = (paise?: number | null) =>
  paise === null || paise === undefined ? "—" : paise === 0 ? "Free" : `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const rupees = (paise?: number | null) => `₹${((paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const isValidDate = (d: Date) => !Number.isNaN(d.getTime());
export const fmtDate = (s?: string | Date | null, opts: Intl.DateTimeFormatOptions = {}) => {
  if (!s) return "—";
  const d = new Date(s);
  return isValidDate(d) ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: TZ, ...opts }) : "—";
};
export const fmtDay = (s?: string | Date | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isValidDate(d) ? d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }) : "—";
};
export const fmtTime = (s?: string | Date | null) => {
  if (!s) return "";
  const d = new Date(s);
  return isValidDate(d) ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ }) : "";
};
export const fmtDT = (s?: string | Date | null) => (s ? `${fmtDate(s)}, ${fmtTime(s)}` : "—");

export const toLocalInput = (s?: string | Date | null) => (s ? new Date(new Date(s).getTime() + 330 * 60000).toISOString().slice(0, 16) : "");
export const fromLocalInput = (v?: string | null) => (v ? `${v}:00+05:30` : null);

export const passStore = {
  all() {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("trz_passes") || "[]");
    } catch {
      return [];
    }
  },
  add(entry: any) {
    if (typeof window === "undefined") return;
    try {
      const list = passStore.all().filter((p: any) => p.id !== entry.id);
      localStorage.setItem("trz_passes", JSON.stringify([entry, ...list].slice(0, 20)));
    } catch {}
  },
};
