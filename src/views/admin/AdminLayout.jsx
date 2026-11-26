"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { NavLink, Outlet, Navigate, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarRange,
  Boxes,
  BookOpenText,
  Ticket,
  Users,
  CreditCard,
  Mail,
  BarChart3,
  Settings,
  Sparkles,
  ScanLine,
  Menu,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { errMsg } from "@/lib/api";
import { useStaffApi } from "@/lib/staff-api";
import { Loading } from "@/components/common/States";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const Ctx = createContext(null);
export const useStaff = () => useContext(Ctx);

const STAFF = ["superadmin", "admin"];
const EVENTS = ["superadmin", "admin", "event_manager"];
export const NAV = [
  ["", "Overview", LayoutDashboard, STAFF],
  ["events", "Events", CalendarRange, EVENTS],
  ["inventory", "Ticket inventory", Boxes, EVENTS],
  ["bookings", "Bookings", BookOpenText, STAFF],
  ["tickets", "Tickets", Ticket, STAFF],
  ["customers", "Customers", Users, STAFF],
  ["payments", "Payments", CreditCard, STAFF],
  ["notifications", "Notifications", Mail, STAFF],
  ["reports", "Reports", BarChart3, STAFF],
  ["hero", "Hero section", Sparkles, STAFF],
  ["settings", "Settings", Settings, STAFF],
];

export function Gatekeeper({ children, roles, area }) {
  const http = useStaffApi();
  const [state, setState] = useState({ loading: true, me: null, error: null });
  const loc = useLocation();

  useEffect(() => {
    http
      .get("/me")
      .then((r) => setState({ loading: false, me: r.data, error: null }))
      .catch((e) => {
        if (e?.response?.status === 401) {
          window.location.href = `/sign-in?next=${encodeURIComponent(loc.pathname)}`;
        } else {
          setState({ loading: false, me: null, error: errMsg(e) });
        }
      });
  }, [http, loc.pathname]);

  if (state.loading) return <div className="p-10"><Loading label="Checking access" /></div>;
  if (state.error) return <Notice title="We couldn't verify your access." body={state.error} link={["/sign-in", "Sign in again"]} />;
  if (!state.me) return null;

  const role = state.me.role;
  if (role === "pending") {
    return (
      <Notice
        title="Your account is awaiting approval."
        body={`Signed in as ${state.me.email}. A TRAILRZ administrator needs to grant you a role before you can continue.`}
      />
    );
  }

  if (!roles.includes(role)) {
    return (
      <Notice
        title={`You don't have access to ${area}.`}
        body={role === "gate_operator" ? "Your role is gate operator." : "Ask an administrator for access."}
        link={role === "gate_operator" ? ["/gate", "Open the gate scanner"] : null}
      />
    );
  }

  return <Ctx.Provider value={{ me: state.me, http }}>{children}</Ctx.Provider>;
}

function Notice({ title, body, link }) {
  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center p-6" data-testid="access-notice">
      <div className="max-w-md">
        <Logo className="h-7" />
        <h1 className="font-display text-4xl mt-10">{title}</h1>
        <p className="text-mineral mt-3">{body}</p>
        <div className="flex items-center gap-5 mt-8">
          {link && (
            <Link to={link[0]} className="btn-ink" data-testid="access-notice-link">
              {link[1]}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function RequireSignIn({ children }) {
  return <>{children}</>;
}

function SideNav({ role, onNav }) {
  return (
    <nav className="flex flex-col gap-0.5 text-sm" aria-label="Admin">
      {NAV.filter(([, , , r]) => r.includes(role)).map(([to, label, Icon]) => (
        <NavLink
          key={label}
          end={to === ""}
          to={`/admin${to ? `/${to}` : ""}`}
          onClick={onNav}
          data-testid={`admin-nav-${to || "overview"}`}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 h-10 transition-colors ${
              isActive
                ? "bg-ink-surface text-parchment border-l-2 border-beam"
                : "text-[#bdb3a3] hover:text-parchment border-l-2 border-transparent"
            }`
          }
        >
          <Icon className="h-4 w-4" aria-hidden /> {label}
        </NavLink>
      ))}
      <NavLink
        to="/gate"
        data-testid="admin-nav-gate"
        className="flex items-center gap-3 px-3 h-10 text-[#bdb3a3] hover:text-parchment mt-4 border-t border-ink-border pt-4"
      >
        <ScanLine className="h-4 w-4" aria-hidden /> Gate scanner
      </NavLink>
    </nav>
  );
}

function StaffAvatar({ me, http }) {
  const logout = async () => {
    try {
      await http.post("/admin/logout");
    } catch {}
    try {
      localStorage.removeItem("trz_staff_token");
    } catch {}
    window.location.href = "/sign-in";
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-beam text-ink font-bold flex items-center justify-center text-xs uppercase shrink-0">
          {me?.name ? me.name[0] : me?.email ? me.email[0] : "A"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-parchment text-xs font-medium">{me?.name || me?.email}</p>
          <p className="capitalize text-[11px] text-[#bdb3a3]">{me?.role?.replace("_", " ")}</p>
        </div>
      </div>
      <button
        onClick={logout}
        title="Sign Out"
        data-testid="staff-logout-button"
        className="text-[#8f8574] hover:text-parchment transition-colors p-1.5 ml-2"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

function Shell({ children }) {
  const { me, http } = useStaff();
  const [open, setOpen] = useState(false);
  const content = children ?? <Outlet />;

  return (
    <div className="min-h-screen bg-[#F6F3EE] lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="hidden lg:flex flex-col bg-ink-deep dark-zone p-4 sticky top-0 h-screen">
        <Link to="/admin" className="mb-8 mt-2">
          <Logo className="h-6" plate />
        </Link>
        <SideNav role={me.role} />
        <div className="mt-auto pt-4 border-t border-ink-border">
          <StaffAvatar me={me} http={http} />
        </div>
      </aside>
      <header className="lg:hidden sticky top-0 z-30 bg-ink-deep dark-zone flex items-center justify-between px-4 h-14">
        <button
          aria-label="Open admin menu"
          data-testid="admin-mobile-menu"
          onClick={() => setOpen(true)}
          className="text-parchment"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Logo className="h-5" plate />
        <div className="w-8">
          <StaffAvatar me={me} http={http} />
        </div>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="bg-ink-deep border-ink-border w-64 p-4 dark-zone">
          <SheetTitle className="sr-only">Admin menu</SheetTitle>
          <div className="mt-10">
            <SideNav role={me.role} onNav={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
      <main className="min-w-0 p-4 sm:p-6 lg:p-8" id="main">
        {content}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <RequireSignIn>
      <Gatekeeper roles={EVENTS} area="the admin portal">
        <Shell>{children}</Shell>
      </Gatekeeper>
    </RequireSignIn>
  );
}
