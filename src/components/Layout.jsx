import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GROUPS, resourceFor, resourceKey } from "../resources";
import ErrorBoundary from "./ErrorBoundary";
import Icon from "./Icon";

const itemPath = (it) => (it.page ? it.page : `/r/${it.model}`);

export default function Layout() {
  const { admin, logout, can, isSuperAdmin } = useAuth();
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");

  // Only show pages this admin can view.
  const allowedGroups = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((it) =>
          it.superOnly ? isSuperAdmin : can(resourceKey(it), "view"),
        ),
      })).filter((g) => g.items.length > 0),
    [can, isSuperAdmin],
  );

  const activeGroup = useMemo(() => {
    for (const g of allowedGroups) {
      if (g.items.some((it) => itemPath(it) === pathname)) return g.group;
    }
    return "Overview";
  }, [pathname, allowedGroups]);

  const [open, setOpen] = useState({});
  const isOpen = (g) => open[g] ?? (g === activeGroup || g === "Overview");

  const filtering = query.trim().length > 0;
  const visibleGroups = useMemo(() => {
    if (!filtering) return allowedGroups;
    const q = query.trim().toLowerCase();
    return allowedGroups.map((g) => ({
      ...g,
      items: g.items.filter(
        (it) => it.label.toLowerCase().includes(q) || (it.model || "").toLowerCase().includes(q),
      ),
    })).filter((g) => g.items.length > 0);
  }, [filtering, query, allowedGroups]);

  const title = useMemo(() => {
    if (pathname.startsWith("/r/")) {
      const model = pathname.slice(3);
      return resourceFor(model)?.label || model;
    }
    for (const g of GROUPS) {
      const hit = g.items.find((it) => it.page === pathname);
      if (hit) return hit.label;
    }
    return "Kaamhai Admin";
  }, [pathname]);

  const initials = (admin?.name || "A").trim().charAt(0).toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar lux">
        <div className="lux-brand">
          <div className="lux-mark">K</div>
          <div>
            <div className="lux-name">Kaamhai</div>
            <div className="lux-sub">ADMIN CONSOLE</div>
          </div>
        </div>

        <div className="lux-search">
          <Icon name="search" size={14} />
          <input
            placeholder="Quick find…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="lux-clear" onClick={() => setQuery("")} aria-label="Clear">
              ✕
            </button>
          )}
        </div>

        <nav className="lux-nav">
          {visibleGroups.map((g) => (
            <div className="lux-group" key={g.group}>
              <button
                className="lux-group-head"
                onClick={() => setOpen((o) => ({ ...o, [g.group]: !isOpen(g.group) }))}
              >
                <span className="lux-group-icon">
                  <Icon name={g.icon} size={14} />
                </span>
                <span className="lux-group-label">{g.group}</span>
                <span className={`lux-chevron${isOpen(g.group) || filtering ? " open" : ""}`}>▸</span>
              </button>
              {(isOpen(g.group) || filtering) && (
                <div className="lux-items">
                  {g.items.map((it) => (
                    <NavLink
                      key={itemPath(it)}
                      to={itemPath(it)}
                      end={it.end}
                      className={({ isActive }) => `lux-item${isActive ? " active" : ""}`}
                      onClick={() => setQuery("")}
                    >
                      <span className="lux-dot" />
                      <span className="lux-item-label">{it.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filtering && visibleGroups.length === 0 && (
            <div className="lux-noresult">No pages match "{query}"</div>
          )}
        </nav>

        <div className="lux-foot">
          <div className="lux-ava">{initials}</div>
          <div className="lux-foot-who">
            <div className="lux-foot-name">{admin?.name || "Admin"}</div>
            <div className="lux-foot-role">Super admin</div>
          </div>
          <button className="lux-logout" onClick={logout} title="Logout">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="topbar-right">
            <span className="topbar-date">
              {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </header>
        <main className="content">
          <ErrorBoundary pathname={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
