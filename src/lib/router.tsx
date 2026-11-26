"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import {
  useRouter as useNextRouter,
  usePathname as useNextPathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from "next/navigation";

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to?: string;
  href?: string;
  replace?: boolean;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, href, children, ...props }, ref) => {
    const target = (to || href || "#") as string;
    return (
      <NextLink ref={ref} href={target} {...props}>
        {children}
      </NextLink>
    );
  }
);
Link.displayName = "Link";

export interface NavLinkProps extends Omit<LinkProps, "className"> {
  className?: string | ((props: { isActive: boolean; isPending?: boolean }) => string);
  end?: boolean;
}

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ to, href, className, end, children, ...props }, ref) => {
    const pathname = useNextPathname() || "";
    const target = (to || href || "#") as string;
    const isActive = end ? pathname === target : pathname.startsWith(target);

    const computedClass =
      typeof className === "function" ? className({ isActive, isPending: false }) : className;

    return (
      <NextLink
        ref={ref}
        href={target}
        className={computedClass}
        aria-current={isActive ? "page" : undefined}
        {...props}
      >
        {children}
      </NextLink>
    );
  }
);
NavLink.displayName = "NavLink";

export function useNavigate() {
  const router = useNextRouter();
  return (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === "number") {
      window.history.go(to);
    } else if (options?.replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  };
}

export function useLocation() {
  const pathname = useNextPathname() || "/";
  const searchParams = useNextSearchParams();
  const searchStr = searchParams?.toString();
  const search = searchStr ? `?${searchStr}` : "";

  return useMemo(() => {
    return {
      pathname,
      search,
      hash: typeof window !== "undefined" ? window.location.hash : "",
      state: null,
      key: `${pathname}${search}`,
    };
  }, [pathname, search]);
}

export function useSearchParams() {
  const searchParams = useNextSearchParams();
  const router = useNextRouter();
  const pathname = useNextPathname() || "";

  const setSearchParams = (
    nextInit: Record<string, string> | URLSearchParams | ((prev: URLSearchParams) => URLSearchParams)
  ) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (typeof nextInit === "function") {
      const res = nextInit(params);
      router.replace(`${pathname}?${res.toString()}`);
    } else if (nextInit instanceof URLSearchParams) {
      router.replace(`${pathname}?${nextInit.toString()}`);
    } else {
      const p = new URLSearchParams();
      for (const [k, v] of Object.entries(nextInit)) {
        if (v !== undefined && v !== null) p.set(k, v);
      }
      router.replace(`${pathname}?${p.toString()}`);
    }
  };

  return [searchParams || new URLSearchParams(), setSearchParams] as const;
}

export function useParams<T extends Record<string, string | string[]>>() {
  return useNextParams() as T;
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useNextRouter();
  useEffect(() => {
    if (replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [router, to, replace]);
  return null;
}

export const OutletContext = createContext<any>(null);

export function Outlet() {
  const ctx = useContext(OutletContext);
  return ctx?.children ?? null;
}

export function useOutlet() {
  const ctx = useContext(OutletContext);
  return ctx?.children ?? null;
}

export function BrowserRouter({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function Routes({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export function Route({ element, children }: { element?: React.ReactNode; children?: React.ReactNode }) {
  return <>{element || children}</>;
}


export function useOutletContext<T = any>(): T {
  const ctx = useContext(OutletContext);
  return ctx;
}
