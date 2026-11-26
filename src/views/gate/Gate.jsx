"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import QrScanner from "qr-scanner";
import { motion } from "framer-motion";
import {
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  Keyboard,
  BarChart3,
  LogOut,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CalendarX2,
  CloudOff,
  ShieldCheck,
  KeyRound,
  DoorOpen,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { errMsg, fmtDT, fmtTime, fmtDay } from "@/lib/api";
import { useStaffApi } from "@/lib/staff-api";
import { Loading } from "@/components/common/States";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSearchParams } from "next/navigation";

// Gate Context for all child components
const GateCtx = createContext(null);
export const useStaff = () => useContext(GateCtx);

const RESULT = {
  GRANTED: { bg: "bg-granted-bg", fg: "text-granted", Icon: CheckCircle2, title: "Admission granted", tone: [880, 0.12] },
  DUPLICATE: { bg: "bg-dup-bg", fg: "text-dup", Icon: AlertTriangle, title: "Already used", tone: [330, 0.35] },
  INVALID: { bg: "bg-invalid-bg", fg: "text-invalid", Icon: XCircle, title: "Admission denied", tone: [180, 0.5] },
  WRONG_EVENT: { bg: "bg-wrong-bg", fg: "text-wrong", Icon: CalendarX2, title: "Wrong event", tone: [260, 0.4] },
  NETWORK: { bg: "bg-ink-deep", fg: "text-dup", Icon: CloudOff, title: "Not verified", tone: [200, 0.3] },
};

const ADVICE = {
  GRANTED: "Let the guest in.",
  DUPLICATE: "Do not admit. Check the guest's booking reference and ask a supervisor.",
  INVALID: "Do not admit. Direct the guest to the box office or support.",
  WRONG_EVENT: "Do not admit. This pass is genuine but for another event.",
  NETWORK: "Do not admit yet. Online verification is required — retry when the connection returns.",
};

function feedback(kind) {
  try {
    const [hz, dur] = RESULT[kind].tone;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    o.frequency.value = hz;
    o.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
    navigator.vibrate?.(kind === "GRANTED" ? 80 : [200, 80, 200]);
  } catch {}
}

function useNetwork(http) {
  const [state, setState] = useState(typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline");
  useEffect(() => {
    let alive = true;
    const ping = () =>
      http
        .get("/gate/ping", { timeout: 5000 })
        .then(() => alive && setState("online"))
        .catch(() => alive && setState(navigator.onLine ? "interrupted" : "offline"));
    ping();
    const t = setInterval(ping, 8000);
    const off = () => setState("offline");
    window.addEventListener("offline", off);
    window.addEventListener("online", ping);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener("offline", off);
      window.removeEventListener("online", ping);
    };
  }, [http]);
  return state;
}

function ResultScreen({ r, onNext }) {
  const c = RESULT[r.result];
  useEffect(() => {
    feedback(r.result);
    if (r.result === "GRANTED") {
      const t = setTimeout(onNext, 2500);
      return () => clearTimeout(t);
    }
  }, [r, onNext]);
  const t = r.ticket;
  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={c.title}
      data-testid={`gate-result-${r.result.toLowerCase()}`}
      onClick={onNext}
      className={`fixed inset-0 z-50 ${c.bg} text-white flex flex-col p-6 sm:p-10 animate-in fade-in duration-200 cursor-pointer`}
    >
      {r.result === "GRANTED" && (
        <motion.div
          aria-hidden
          className="absolute left-0 top-0 h-2 bg-granted"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2.5, ease: "linear" }}
        />
      )}
      <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto w-full">
        <motion.div
          initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 16 }}
          {...(r.result === "INVALID" || r.result === "WRONG_EVENT" ? { whileInView: { x: [0, -14, 14, -8, 8, 0] } } : {})}
        >
          <c.Icon className={`h-28 w-28 ${c.fg}`} strokeWidth={1.6} aria-hidden />
        </motion.div>
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="font-display text-6xl sm:text-7xl mt-6 leading-none"
          data-testid="gate-result-title"
        >
          {c.title}
        </motion.h1>
        {r.reason && <p className="text-lg mt-4 text-white/85">{r.reason}</p>}
        {t && (
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/20 pt-6">
            <div className="col-span-2">
              <dt className="text-xs uppercase tracking-[0.08em] text-white/60">Guest</dt>
              <dd className="text-3xl font-medium" data-testid="gate-result-guest">
                {t.holder_name}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.08em] text-white/60">Tier</dt>
              <dd className="text-lg">{t.tier_name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.08em] text-white/60">Serial</dt>
              <dd className="font-serial">{t.serial}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs uppercase tracking-[0.08em] text-white/60">Event</dt>
              <dd>{t.event_title}</dd>
            </div>
            {r.admitted_at && (
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-[0.08em] text-white/60">Admitted</dt>
                <dd>{fmtDT(r.admitted_at)}</dd>
              </div>
            )}
            {r.previous_admission && (
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-[0.08em] text-white/60">First admitted</dt>
                <dd className="text-xl" data-testid="gate-previous-admission">
                  {fmtDT(r.previous_admission.at)}
                  {r.previous_admission.gate ? ` · ${r.previous_admission.gate}` : ""}
                  {r.previous_admission.by ? ` · by ${r.previous_admission.by}` : ""}
                </dd>
              </div>
            )}
          </dl>
        )}
        <p className="mt-8 text-lg font-medium border-l-4 border-white/60 pl-4">{ADVICE[r.result]}</p>
      </div>
      <button
        data-testid="gate-next-scan"
        onClick={onNext}
        className="w-full max-w-xl mx-auto h-16 bg-white text-ink text-lg font-semibold active:bg-[#e0ded8]"
      >
        Next scan{r.result === "GRANTED" ? " (auto)" : ""}
      </button>
    </div>
  );
}

function Manual({ open, onClose, eventId, onAdmit }) {
  const { http } = useStaff();
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const search = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      setRes((await http.get(`/gate/search?event_id=${eventId}&q=${encodeURIComponent(q)}`)).data.items);
    } catch (er) {
      setRes([]);
      alert(errMsg(er));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="bg-ink-deep text-parchment border-ink-border h-[85vh] overflow-y-auto dark-zone">
        <SheetTitle className="font-display text-3xl font-normal text-parchment">Manual lookup</SheetTitle>
        <form onSubmit={search} className="flex gap-2 mt-4">
          <input
            autoFocus
            data-testid="gate-manual-input"
            minLength={3}
            required
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Serial, booking ref, name or phone"
            className="flex-1 h-14 px-4 bg-ink-surface border border-ink-border text-lg outline-none focus:border-beam"
          />
          <button data-testid="gate-manual-search" className="h-14 px-5 bg-beam text-ink font-semibold">
            {busy ? "…" : "Find"}
          </button>
        </form>
        <div className="mt-6 space-y-2">
          {res?.length === 0 && (
            <p className="text-[#bdb3a3]" data-testid="gate-manual-empty">
              No passes for this event match.
            </p>
          )}
          {res?.map((t) => (
            <div key={t.id} className="border border-ink-border p-4 flex items-center gap-4" data-testid={`gate-manual-result-${t.serial}`}>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-medium truncate">{t.holder_name}</p>
                <p className="text-sm text-[#bdb3a3]">
                  <span className="font-serial">{t.serial}</span> · {t.tier_name} · {t.status}
                </p>
              </div>
              <button
                data-testid={`gate-manual-admit-${t.serial}`}
                onClick={() => onAdmit(t.id)}
                className="h-12 px-5 bg-parchment text-ink font-semibold"
              >
                Verify & admit
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#8f8574] mt-6">Admission is verified by the server. A pass already used will be refused here too.</p>
      </SheetContent>
    </Sheet>
  );
}

function Summary({ open, onClose, eventId, gate }) {
  const { http } = useStaff();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    http
      .get(`/gate/summary?event_id=${eventId}&gate_label=${encodeURIComponent(gate)}`)
      .then((res) => {
        if (active) setData(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, eventId, gate, http]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="bg-ink-deep text-parchment border-ink-border dark-zone">
        <SheetTitle className="font-display text-3xl font-normal text-parchment">Session summary</SheetTitle>
        {loading || !data ? (
          <Loading dark />
        ) : (
          <div data-testid="gate-summary">
            <p className="text-sm text-[#bdb3a3] mt-1">
              {data.event.title} · {data.gate_label} · {data.operator}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6">
              {[
                ["GRANTED", "Admitted", "text-granted"],
                ["DUPLICATE", "Duplicates", "text-dup"],
                ["INVALID", "Invalid", "text-invalid"],
                ["WRONG_EVENT", "Wrong event", "text-wrong"],
              ].map(([k, l, c]) => (
                <div key={k} className="border border-ink-border p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-[#bdb3a3]">{l}</p>
                  <p className={`font-display text-5xl tabular ${c}`} data-testid={`gate-summary-${k.toLowerCase()}`}>
                    {data.session[k]}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-lg tabular" data-testid="gate-summary-event-total">
              Event-wide: {data.event_admitted} of {data.event_total} passes admitted
            </p>
            <p className="text-sm text-[#bdb3a3] mt-1">
              Last scan: {data.last_scan ? `${fmtTime(data.last_scan.at)} — ${data.last_scan.result}` : "none yet"}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Scanner({ session, onExit }) {
  const { http, me } = useStaff();
  const net = useNetwork(http);
  const video = useRef(null);
  const scanner = useRef(null);
  const last = useRef({ data: null, at: 0 });
  const busy = useRef(false);
  const [cam, setCam] = useState({ state: "starting", flash: false, flashOn: false, cameras: [], idx: 0 });
  const [result, setResult] = useState(null);
  const [panel, setPanel] = useState(null);
  const [count, setCount] = useState(0);

  const verify = useCallback(
    async (body) => {
      if (busy.current) return;
      busy.current = true;
      scanner.current?.pause();
      try {
        const { data } = await http.post(
          "/gate/scan",
          { event_id: session.event.id, gate_label: session.gate, ...body },
          { timeout: 8000 }
        );
        if (data.result === "GRANTED") setCount((c) => c + 1);
        setResult(data);
      } catch (e) {
        setResult(
          e.response
            ? { result: "INVALID", reason: errMsg(e) }
            : { result: "NETWORK", reason: "The server could not be reached. This pass has NOT been checked." }
        );
      }
    },
    [http, session]
  );

  const next = useCallback(() => {
    setResult(null);
    busy.current = false;
    if (scanner.current && !panel) scanner.current.start().catch(() => {});
  }, [panel]);

  useEffect(() => {
    if (!video.current) return;
    const s = new QrScanner(
      video.current,
      (r) => {
        const now = Date.now();
        if (r.data === last.current.data && now - last.current.at < 4000) return;
        last.current = { data: r.data, at: now };
        verify({ payload: r.data });
      },
      { preferredCamera: "environment", maxScansPerSecond: 4, returnDetailedScanResult: true }
    );
    scanner.current = s;
    s.start()
      .then(async () => {
        const [flash, cameras] = await Promise.all([
          s.hasFlash().catch(() => false),
          QrScanner.listCameras(true).catch(() => []),
        ]);
        setCam((c) => ({ ...c, state: "on", flash, cameras }));
      })
      .catch((e) =>
        setCam((c) => ({
          ...c,
          state: String(e).includes("NotAllowed") || String(e).includes("permission") ? "denied" : "unavailable",
        }))
      );
    return () => {
      s.destroy();
      scanner.current = null;
    };
  }, [verify]);

  const toggleFlash = async () => {
    try {
      await scanner.current.toggleFlash();
      setCam((c) => ({ ...c, flashOn: scanner.current.isFlashOn() }));
    } catch {}
  };

  const switchCam = async () => {
    if (cam.cameras.length < 2) return;
    const idx = (cam.idx + 1) % cam.cameras.length;
    await scanner.current.setCamera(cam.cameras[idx].id).catch(() => {});
    const flash = await scanner.current.hasFlash().catch(() => false);
    setCam((c) => ({ ...c, idx, flash, flashOn: false }));
  };

  const openPanel = (p) => {
    setPanel(p);
    scanner.current?.pause();
  };
  const closePanel = () => {
    setPanel(null);
    if (!result) scanner.current?.start().catch(() => {});
  };

  const NetIcon = net === "online" ? Wifi : WifiOff;
  const Ctl = ({ onClick, label, Icon, testid, disabled }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      aria-label={label}
      className="flex flex-col items-center justify-center gap-1 h-20 bg-ink-surface border border-ink-border text-xs disabled:opacity-30 active:bg-ink-border cursor-pointer transition-colors"
    >
      <Icon className="h-6 w-6 text-[#dedad1]" aria-hidden />
      <span className="text-[#dedad1]">{label}</span>
    </button>
  );

  return (
    <div className="min-h-[100dvh] bg-ink-deep text-parchment flex flex-col dark-zone" data-testid="gate-scanner">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-ink-border bg-ink-surface">
        <Logo className="h-5" plate />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" data-testid="gate-event-name">
            {session.event.title}
          </p>
          <p className="text-xs text-[#bdb3a3] truncate">
            {session.gate} · {session.event.venue || session.event.city}
          </p>
        </div>
        <span
          data-testid="gate-network-status"
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 ${
            net === "online" ? "bg-granted-bg text-granted" : "bg-invalid-bg text-invalid"
          }`}
        >
          <NetIcon className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">{net === "online" ? "Online" : net === "interrupted" ? "Interrupted" : "Offline"}</span>
        </span>
        <button
          onClick={onExit}
          data-testid="gate-header-exit"
          title="Exit / Switch Door"
          className="inline-flex items-center gap-1.5 text-xs text-[#bdb3a3] hover:text-white border border-ink-border px-3 py-1.5 active:bg-ink-border transition-colors cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Exit</span>
        </button>
      </header>

      {net !== "online" && (
        <p className="bg-invalid-bg text-white text-xs px-4 py-2" role="alert">
          Online verification required. Passes cannot be validated offline — do not admit guests until connected.
        </p>
      )}

      <div className="relative flex-1 min-h-[52vh] bg-black overflow-hidden flex items-center justify-center">
        <video ref={video} className="absolute inset-0 w-full h-full object-cover" muted playsInline data-testid="gate-camera-viewport" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <div className="w-[68vw] max-w-[300px] aspect-square border-2 border-beam relative" style={{ boxShadow: "0 0 0 100vmax rgba(18,17,16,.65)" }}>
            <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-beam" />
            <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-beam" />
            <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-beam" />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-beam" />
          </div>
        </div>
        <p className="absolute bottom-4 inset-x-0 text-center text-xs text-white/90 px-4">
          {cam.state === "on"
            ? "Align guest pass QR inside the square"
            : cam.state === "starting"
            ? "Starting camera…"
            : cam.state === "denied"
            ? "Camera permission denied — enable camera access or use manual lookup."
            : "Camera unavailable — use manual lookup below."}
        </p>
      </div>

      <div className="px-5 py-3 flex justify-between items-baseline border-t border-ink-border bg-ink-surface">
        <span className="text-xs uppercase tracking-[0.08em] text-[#bdb3a3]">Admitted this session</span>
        <span className="font-display text-4xl tabular text-beam" data-testid="gate-session-count">
          {count}
        </span>
      </div>

      <nav className="grid grid-cols-4 gap-2 p-4 pt-2 bg-ink-deep" aria-label="Scanner controls">
        <Ctl
          onClick={toggleFlash}
          disabled={!cam.flash}
          label={cam.flash ? (cam.flashOn ? "Torch off" : "Torch on") : "No torch"}
          Icon={cam.flashOn ? FlashlightOff : Flashlight}
          testid="gate-torch-toggle"
        />
        <Ctl
          onClick={switchCam}
          disabled={cam.cameras.length < 2}
          label="Flip camera"
          Icon={SwitchCamera}
          testid="gate-switch-camera"
        />
        <Ctl onClick={() => openPanel("manual")} label="Manual check" Icon={Keyboard} testid="gate-manual-open" />
        <Ctl onClick={() => openPanel("summary")} label="Stats" Icon={BarChart3} testid="gate-summary-open" />
      </nav>

      <div className="p-4 pt-0 bg-ink-deep">
        <button
          onClick={onExit}
          data-testid="gate-change-event"
          className="w-full h-11 border border-ink-border text-xs text-[#bdb3a3] hover:text-white transition-colors cursor-pointer"
        >
          Change event or switch gate terminal
        </button>
      </div>

      <Manual
        open={panel === "manual"}
        onClose={closePanel}
        eventId={session.event.id}
        onAdmit={(id) => {
          setPanel(null);
          verify({ ticket_id: id });
        }}
      />
      <Summary open={panel === "summary"} onClose={closePanel} eventId={session.event.id} gate={session.gate} />
      {result && <ResultScreen r={result} onNext={next} />}
    </div>
  );
}

function GateLogin({ initialKey = "", initialPin = "", initialGate = "Main gate", onLoggedIn }) {
  const [key, setKey] = useState(initialKey);
  const [pin, setPin] = useState(initialPin);
  const [gateLabel, setGateLabel] = useState(initialGate);
  const [showPin, setShowPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!key.trim()) {
      setError("Please enter the Gate Terminal ID");
      return;
    }
    if (!pin.trim()) {
      setError("Please enter the Gate Passcode / PIN");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/gate/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim(),
          pin: pin.trim(),
          gate_label: gateLabel.trim() || "Main gate",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Invalid gate credentials");
      }

      const sessionObj = {
        event: data.event,
        gate: data.gate || gateLabel.trim() || "Main gate",
        operator: `Gate Staff — ${data.event.title}`,
      };

      try {
        localStorage.setItem("trz_staff_token", data.token);
        localStorage.setItem("trz_gate_session", JSON.stringify(sessionObj));
      } catch {}

      onLoggedIn({
        session: sessionObj,
        token: data.token,
      });
    } catch (err) {
      setError(err?.message || "Could not authenticate gate terminal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121110] text-[#f7f4ed] flex flex-col justify-between p-6 sm:p-10 dark-zone">
      <header className="flex items-center justify-between">
        <Logo className="h-6" plate />
        <span className="text-xs uppercase tracking-[0.12em] bg-ink-surface border border-ink-border px-3 py-1 text-beam font-medium">
          Gate Portal
        </span>
      </header>

      <main className="max-w-md w-full mx-auto my-auto py-10">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-5 w-5 text-beam" />
          <span className="text-xs font-mono uppercase tracking-wider text-[#bdb3a3]">Door Staff & Security Access</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl leading-tight">Entrance Gate Terminal</h1>
        <p className="text-sm text-[#bdb3a3] mt-2">
          Sign into your venue entrance terminal to begin scanning attendee passes.
        </p>

        {error && (
          <div
            role="alert"
            data-testid="gate-login-error"
            className="mt-6 p-4 bg-[#2a1313] border border-[#782828] text-[#ff9e9e] text-sm flex items-start gap-2.5 animate-in fade-in"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-[#ff7070] mt-0.5" />
            <div className="min-w-0">
              <p className="font-medium">Access Denied</p>
              <p className="text-xs text-[#ffb0b0] mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4" data-testid="gate-login-form">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#bdb3a3] mb-1 font-medium">
              Gate Terminal ID / Username
            </label>
            <div className="relative">
              <input
                data-testid="gate-terminal-input"
                required
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g. gate-founders-connect"
                className="w-full h-14 px-4 bg-ink-surface border border-ink-border text-base text-parchment outline-none focus:border-beam font-mono transition-colors"
              />
            </div>
            <p className="text-[11px] text-[#8f8574] mt-1">Generated by the event organizer in the TRAILRZ Admin</p>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#bdb3a3] mb-1 font-medium">
              Staff Passcode / PIN
            </label>
            <div className="relative">
              <input
                data-testid="gate-pin-input"
                required
                type={showPin ? "text" : "password"}
                autoCapitalize="none"
                autoCorrect="off"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="e.g. 2026"
                className="w-full h-14 pl-4 pr-12 bg-ink-surface border border-ink-border text-base text-parchment outline-none focus:border-beam font-mono tracking-wider transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#bdb3a3] hover:text-white"
                aria-label={showPin ? "Hide passcode" : "Show passcode"}
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#bdb3a3] mb-1 font-medium">
              Gate / Door Name
            </label>
            <div className="relative">
              <input
                data-testid="gate-door-input"
                value={gateLabel}
                onChange={(e) => setGateLabel(e.target.value)}
                placeholder="Main gate, VIP Entrance, North Door"
                className="w-full h-14 px-4 bg-ink-surface border border-ink-border text-base text-parchment outline-none focus:border-beam transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            data-testid="gate-submit-btn"
            className="w-full h-14 bg-beam hover:bg-[#ebd27c] text-ink text-base font-semibold transition-colors flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-50"
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                Connecting to Terminal…
              </span>
            ) : (
              <>
                <span>Launch Gate Scanner</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-ink-border text-center text-xs text-[#8f8574]">
          <p>
            Are you an event manager with email credentials?{" "}
            <Link href="/sign-in?next=%2Fgate" className="text-beam hover:underline">
              Admin Login →
            </Link>
          </p>
        </div>
      </main>

      <footer className="text-center text-xs text-[#8f8574]">
        TRAILRZ Gate Admissions Engine · Secure Door Terminal
      </footer>
    </div>
  );
}

function Setup({ data, onStart, onSwitchToLogin }) {
  const { http, me } = useStaff();
  const [gate, setGate] = useState("Main gate");

  useEffect(() => {
    try {
      const g = localStorage.getItem("trz_gate_label");
      if (g) setGate(g);
    } catch {}
  }, []);

  const handleLogout = async () => {
    try {
      await http.post("/admin/logout");
    } catch {}
    try {
      localStorage.removeItem("trz_staff_token");
      localStorage.removeItem("trz_gate_session");
    } catch {}
    window.location.href = "/sign-in";
  };

  return (
    <div className="max-w-lg mx-auto p-6 min-h-screen flex flex-col justify-between" data-testid="gate-setup">
      <div>
        <div className="flex items-center justify-between">
          <Logo className="h-6" plate />
          <button onClick={handleLogout} data-testid="gate-logout" className="inline-flex items-center gap-2 text-sm text-[#bdb3a3] cursor-pointer">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>

        <p className="text-xs uppercase tracking-[0.08em] text-[#bdb3a3] mt-10">
          Gate admission · {me?.name || "Staff"} ({me?.role ? me.role.replace("_", " ") : "operator"})
        </p>
        <h1 className="font-display text-5xl mt-3">Which door tonight?</h1>

        <label className="block mt-8">
          <span className="text-sm">Gate name</span>
          <input
            data-testid="gate-label-input"
            value={gate}
            onChange={(e) => setGate(e.target.value)}
            className="w-full h-14 px-4 mt-2 bg-ink-surface border border-ink-border text-lg outline-none focus:border-beam"
          />
        </label>

        <p className="text-sm mt-8 mb-3">
          {me?.role === "gate_operator" ? "Your assigned events" : "Upcoming events"}
        </p>

        {(!data?.events || data.events.length === 0) ? (
          <div className="p-6 border border-ink-border bg-ink-surface text-center">
            <p className="text-[#bdb3a3]" data-testid="gate-no-events">
              No events are currently scheduled for your account.
            </p>
            <button
              onClick={onSwitchToLogin}
              className="mt-4 text-xs text-beam underline font-mono cursor-pointer"
            >
              Sign in with Gate Terminal ID & PIN instead →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {data.events.map((e) => (
              <button
                key={e.id}
                data-testid={`gate-event-${e.id}`}
                onClick={() => {
                  try {
                    localStorage.setItem("trz_gate_label", gate);
                  } catch {}
                  onStart({ event: e, gate: gate.trim() || "Main gate" });
                }}
                className="w-full text-left p-5 border border-ink-border bg-ink-surface hover:border-beam active:bg-ink-border transition-colors cursor-pointer"
              >
                <p className="text-xl font-medium">{e.title}</p>
                <p className="text-sm text-[#bdb3a3] mt-1">
                  {fmtDay(e.start_at)}, {fmtTime(e.start_at)} · {e.venue || e.city}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pt-8 text-center">
        <button
          onClick={onSwitchToLogin}
          className="text-xs text-[#8f8574] hover:text-[#bdb3a3] underline cursor-pointer"
        >
          Use Gate Terminal ID & PIN instead
        </button>
      </div>
    </div>
  );
}

export default function Gate() {
  const searchParams = useSearchParams();
  const urlKey = searchParams?.get("key") || "";
  const urlPin = searchParams?.get("pin") || "";
  const urlGate = searchParams?.get("gate") || "Main gate";

  const http = useStaffApi();
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [mode, setMode] = useState("auto"); // "auto", "login", "setup"

  // Handle URL direct credentials or existing saved session
  useEffect(() => {
    let active = true;

    async function init() {
      // 1. Direct login via URL params (?key=...&pin=...)
      if (urlKey && urlPin) {
        try {
          const res = await fetch("/api/gate/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: urlKey.trim(),
              pin: urlPin.trim(),
              gate_label: urlGate.trim() || "Main gate",
            }),
          });
          const data = await res.json();
          if (res.ok && data?.token && active) {
            const sess = {
              event: data.event,
              gate: data.gate || urlGate.trim() || "Main gate",
              operator: `Gate Staff — ${data.event.title}`,
            };
            try {
              localStorage.setItem("trz_staff_token", data.token);
              localStorage.setItem("trz_gate_session", JSON.stringify(sess));
            } catch {}
            setSession(sess);
            setMe({ name: sess.operator, role: "gate_operator" });
            setInitialLoading(false);
            return;
          }
        } catch {}
      }

      // 2. Check saved session in localStorage
      try {
        const savedToken = localStorage.getItem("trz_staff_token");
        const savedSessRaw = localStorage.getItem("trz_gate_session");
        if (savedToken && savedSessRaw) {
          const parsed = JSON.parse(savedSessRaw);
          if (parsed?.event?.id && active) {
            setSession(parsed);
            setMe({ name: parsed.operator || "Gate Operator", role: "gate_operator" });
            setInitialLoading(false);
            return;
          }
        }
      } catch {}

      // 3. Check if user is logged in as an Admin staff via cookie/token
      try {
        const meRes = await http.get("/gate/me");
        if (meRes.data && active) {
          setMe(meRes.data.operator);
          setAdminData(meRes.data);
          setMode("setup");
          setInitialLoading(false);
          return;
        }
      } catch {}

      // Default: show GateLogin
      if (active) {
        setMode("login");
        setInitialLoading(false);
      }
    }

    init();

    return () => {
      active = false;
    };
  }, [urlKey, urlPin, urlGate, http]);

  const handleExit = () => {
    try {
      localStorage.removeItem("trz_gate_session");
      localStorage.removeItem("trz_staff_token");
    } catch {}
    setSession(null);
    setMode("login");
  };

  const handleGateLoggedIn = ({ session: sess }) => {
    setSession(sess);
    setMe({ name: sess.operator, role: "gate_operator" });
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-ink-deep text-parchment flex items-center justify-center dark-zone">
        <Loading dark label="Connecting to Gate Terminal" />
      </div>
    );
  }

  return (
    <GateCtx.Provider value={{ http, me: me || { name: "Gate Operator", role: "gate_operator" }, session, onExit: handleExit }}>
      <div className="min-h-screen bg-ink-deep text-parchment dark-zone">
        {session ? (
          <Scanner session={session} onExit={handleExit} />
        ) : mode === "setup" && adminData ? (
          <Setup
            data={adminData}
            onStart={(s) => setSession(s)}
            onSwitchToLogin={() => setMode("login")}
          />
        ) : (
          <GateLogin
            initialKey={urlKey}
            initialPin={urlPin}
            initialGate={urlGate}
            onLoggedIn={handleGateLoggedIn}
          />
        )}
      </div>
    </GateCtx.Provider>
  );
}
