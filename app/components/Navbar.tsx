"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth";

interface NavbarProps {
  user?: any;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("eepy_username");
      if (stored) {
        setUsername(stored);
      } else if (user?.displayName) {
        setUsername(user.displayName);
      } else if (user?.email) {
        setUsername(user.email.split("@")[0]);
      }
    }
  }, [user]);

  const currentPath = pathname ? pathname.replace(/\/+$/, "") || "/" : "/";

  const navItems = [
    {
      label: "Dashboard",
      href: "/",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      label: "Live Cam",
      href: "/camera",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      label: "Daily Log",
      href: "/log",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      label: "History",
      href: "/history",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      label: "Profile",
      href: "/profile",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
  ];

  const handleSignOut = async () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("eepy_demo_mode");
      localStorage.removeItem("eepy_demo_mode");
    }
    await logout();
  };

  return (
    <header className="sticky top-0 z-50 glass-nav border-b border-pink-500/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand: Scaled up with icon-background.png */}
          <Link href="/" className="flex items-center gap-3.5 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-background.png"
              alt="Eepy"
              className="w-12 h-12 rounded-2xl object-contain border border-pink-500/40 shadow-lg shadow-pink-500/10 group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-extrabold text-2xl tracking-tight text-white block leading-none">
                Eepy
              </span>
              <span className="text-[11px] font-semibold text-pink-300/80 uppercase tracking-wider block mt-1">
                Sleep Station
              </span>
            </div>
          </Link>

          {/* Desktop Navigation: Larger padding and text */}
          {user && (
            <nav className="hidden md:flex items-center space-x-2 bg-black/50 p-1.5 rounded-2xl border border-pink-500/20">
              {navItems.map((item) => {
                const isActive = item.href === "/"
                  ? currentPath === "/"
                  : currentPath === item.href || currentPath.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-pink-600 text-white shadow-lg shadow-pink-600/40 border border-pink-400"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                        isActive
                          ? "bg-white text-pink-600 shadow-sm"
                          : "bg-white/10 text-white/80"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* User Status / Logout */}
          <div className="hidden md:flex items-center gap-3.5">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-black/40 px-3.5 py-2 rounded-xl border border-pink-500/25">
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                  <span className="text-xs font-bold text-white max-w-[150px] truncate">
                    {username ? `@${username}` : user.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-xs font-bold text-pink-200 hover:text-white bg-pink-600/20 hover:bg-pink-600/40 border border-pink-500/40 rounded-xl transition-all shadow-sm"
                >
                  Sign Out
                </button>
              </div>
            ) : null}
          </div>

          {/* Mobile menu button */}
          {user && (
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 rounded-xl bg-black/40 border border-pink-500/30 text-white focus:outline-none"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Mobile Drawer */}
      {user && mobileMenuOpen && (
        <div className="md:hidden px-4 pt-3 pb-6 space-y-2 border-t border-pink-500/20 bg-[#120917]/98 backdrop-blur-xl">
          {navItems.map((item) => {
            const isActive = item.href === "/"
              ? currentPath === "/"
              : currentPath === item.href || currentPath.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-all ${
                  isActive
                    ? "bg-pink-600 text-white shadow-md shadow-pink-600/40 border border-pink-400"
                    : "text-white/70 hover:bg-white/5"
                }`}
              >
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                    isActive ? "bg-white text-pink-600" : "bg-white/10 text-white/80"
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-4 border-t border-pink-500/20 flex items-center justify-between">
            <span className="text-sm font-semibold text-white/80 truncate max-w-[200px]">
              {username ? `@${username}` : user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-xs font-bold text-pink-200 bg-pink-600/20 border border-pink-500/40 rounded-xl"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
