// macOS context-menu replica (SPEC §4.6), shared by every interactive island.
import { gsap } from "./gsap.js";
import { reduced } from "./motion.js";
import { fmtPct, fmtReset } from "./format.js";
import { toast } from "./banner.js";

let open = null; // the one open menu

const el = (tag, cls, attrs = {}) => { const n = document.createElement(tag); if (cls) n.className = cls; for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };

/**
 * Item shapes:
 *  { type:"info", label, detail }   disabled live row (plain text, like the app's MenuContent)
 *  { type:"sep" }
 *  { type:"action", label, onSelect }
 *  { type:"link", label, href }
 *  { type:"check", label, checked, onSelect(checked) }
 *  { type:"submenu", label, items:[{ type:"radio", label, checked, onSelect }] }
 */
export function openMenu(island, { x, y, items, trigger } = {}) {
  closeMenu();
  const returnTo = trigger || island?.el?.querySelector(".island__hit") || document.activeElement;
  const root = buildMenu(items, { returnTo });
  document.body.append(root);
  place(root, x, y);
  open = { root, returnTo, island };
  const first = root.querySelector('[role^="menuitem"]:not([aria-disabled="true"])');
  first && focusItem(root, first);
  if (!reduced()) gsap.fromTo(root, { scale: 0.96, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.14, ease: "settle" });
  setTimeout(() => {
    document.addEventListener("pointerdown", onOutside, true);
    window.addEventListener("scroll", closeMenu, { passive: true, once: true });
    window.addEventListener("wheel", closeMenu, { passive: true, once: true });
    window.addEventListener("resize", closeMenu, { once: true });
  });
  return root;
}

export function closeMenu({ restoreFocus = false } = {}) {
  if (!open) return;
  const { root, returnTo } = open;
  open = null;
  document.removeEventListener("pointerdown", onOutside, true);
  window.removeEventListener("scroll", closeMenu);
  window.removeEventListener("wheel", closeMenu);
  root.remove();
  document.querySelectorAll(".cm-menu").forEach((m) => m.remove());
  if (restoreFocus && returnTo && returnTo.focus) returnTo.focus({ preventScroll: true });
}
const onOutside = (e) => { if (!e.target.closest(".cm-menu")) closeMenu(); };

function place(root, x, y) {
  const r = root.getBoundingClientRect();
  const left = Math.min(Math.max(8, x), innerWidth - r.width - 8);
  const top = Math.min(Math.max(8, y), innerHeight - r.height - 8);
  root.style.left = `${left}px`; root.style.top = `${top}px`;
  root.style.transformOrigin = `${x - left <= r.width / 2 ? "left" : "right"} ${y - top <= r.height / 2 ? "top" : "bottom"}`;
}

function buildMenu(items, { returnTo, sub = false }) {
  const root = el("div", "cm-menu" + (sub ? " cm-menu--sub" : ""), { role: "menu", "aria-orientation": "vertical" });
  items.forEach((it) => {
    if (it.type === "sep") return root.append(el("div", "cm-menu__sep", { role: "separator" }));
    const role = it.type === "check" ? "menuitemcheckbox" : it.type === "radio" ? "menuitemradio" : "menuitem";
    const row = el(it.type === "link" ? "a" : "div", "cm-menu__item", { role, tabindex: "-1" });
    if (it.type === "link") { row.href = it.href; row.target = "_blank"; row.rel = "noopener"; }
    if (it.type === "info") row.setAttribute("aria-disabled", "true");
    if (it.type === "check" || it.type === "radio") row.setAttribute("aria-checked", String(!!it.checked));
    const check = el("span", "cm-menu__check", { "aria-hidden": "true" });
    check.textContent = it.checked ? "✓" : "";
    const label = el("span", "cm-menu__label");
    label.append(document.createTextNode(it.label));
    row.append(check, label);
    if (it.detail) { const d = el("span", "cm-menu__detail"); d.textContent = it.detail; row.append(d); }
    if (it.type === "submenu") { row.setAttribute("aria-haspopup", "menu"); row.setAttribute("aria-expanded", "false"); row.append(Object.assign(el("span", "cm-menu__arrow", { "aria-hidden": "true" }), { innerHTML: '<svg width="6" height="10" viewBox="0 0 6 10" style="display:block"><path d="M1.2 1.2 4.8 5 1.2 8.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' })); }
    row._item = it;
    root.append(row);
  });

  const items$ = () => [...root.children].filter((n) => n.getAttribute("role")?.startsWith("menuitem") && n.getAttribute("aria-disabled") !== "true");
  const activate = (row) => {
    const it = row._item;
    if (!it || row.getAttribute("aria-disabled") === "true") return;
    if (it.type === "submenu") return openSub(row);
    if (it.type === "check") { it.checked = !it.checked; it.onSelect && it.onSelect(it.checked); closeMenu({ restoreFocus: true }); return; }
    if (it.type === "link") { closeMenu(); return; } // native navigation proceeds
    closeMenu({ restoreFocus: it.type !== "action" || !it.keepFocus });
    it.onSelect && it.onSelect();
  };
  const openSub = (row) => {
    root.querySelectorAll(":scope > .cm-menu--sub").forEach((m) => m.remove());
    const subEl = buildMenu(row._item.items, { returnTo: row, sub: true });
    root.append(subEl);
    row.setAttribute("aria-expanded", "true");
    const rr = row.getBoundingClientRect(), pr = root.getBoundingClientRect();
    const w = 180;
    const flip = rr.right + w > innerWidth - 8;
    subEl.style.left = `${flip ? -w + 4 : pr.width - 4}px`;
    subEl.style.top = `${rr.top - pr.top - 5}px`;
    const f = subEl.querySelector('[role^="menuitem"]');
    f && focusItem(subEl, f);
  };
  root.addEventListener("click", (e) => {
    const row = e.target.closest(".cm-menu__item");
    if (!row || row.parentElement !== root) return;
    if (row.tagName !== "A") e.preventDefault();
    activate(row);
  });
  root.addEventListener("pointermove", (e) => {
    const row = e.target.closest(".cm-menu__item");
    if (!row || row.parentElement !== root || row.getAttribute("aria-disabled") === "true") return;
    if (document.activeElement !== row) focusItem(root, row);
    if (row._item.type === "submenu" && row.getAttribute("aria-expanded") !== "true") openSub(row);
    else if (row._item.type !== "submenu") { root.querySelectorAll(":scope > .cm-menu--sub").forEach((m) => m.remove()); root.querySelectorAll('[aria-expanded="true"]').forEach((n) => n.setAttribute("aria-expanded", "false")); }
  });
  root.addEventListener("keydown", (e) => {
    const row = e.target.closest(".cm-menu__item");
    if (!row || row.parentElement !== root) return;
    const list = items$(), i = list.indexOf(row);
    const go = (n) => { e.preventDefault(); focusItem(root, list[(n + list.length) % list.length]); };
    switch (e.key) {
      case "ArrowDown": return go(i + 1);
      case "ArrowUp": return go(i - 1);
      case "Home": return go(0);
      case "End": return go(list.length - 1);
      case "Enter": case " ": e.preventDefault(); return activate(row);
      case "ArrowRight": if (row._item.type === "submenu") { e.preventDefault(); openSub(row); } return;
      case "ArrowLeft": if (sub) { e.preventDefault(); e.stopPropagation(); returnTo.setAttribute("aria-expanded", "false"); root.remove(); returnTo.focus(); } return;
      case "Escape": e.preventDefault(); e.stopPropagation();
        if (sub) { returnTo.setAttribute("aria-expanded", "false"); root.remove(); returnTo.focus(); } else closeMenu({ restoreFocus: true });
        return;
      case "Tab": e.preventDefault(); closeMenu({ restoreFocus: true }); return;
    }
  });
  return root;
}

function focusItem(root, row) {
  root.querySelectorAll(":scope > .cm-menu__item").forEach((n) => n.setAttribute("tabindex", "-1"));
  row.setAttribute("tabindex", "0");
  row.focus({ preventScroll: true });
}

/* ---------------- the app's real menu ---------------- */

const store = (key, val) => { try { if (val === undefined) return JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify(val)); } catch { return null; } };

/**
 * defaultItems(island, hooks) → items in the app's real order.
 * hooks (all optional): onMaterial(m), onDisplay(d), onBurnRate(b), onNotifications(b), onMenuBar(b),
 *   onLaunchAtLogin(b), onQuit(), onRefresh(), state:{material, display, burnRate, notifications, menuBar, login},
 *   persist:"key" (per-viewer localStorage of the toggles)
 * Default behaviour (when a hook is absent): island.setOption(...) for material / display / burnRate.
 */
export function defaultItems(island, hooks = {}) {
  const s = island.menuState || (island.menuState = {
    material: "solid", display: "percent", burnRate: true, notifications: false, menuBar: false, login: false,
    ...(hooks.persist ? store(`cm-menu:${hooks.persist}`) : null), ...hooks.state,
  });
  const save = () => hooks.persist && store(`cm-menu:${hooks.persist}`, s);
  const d = island.data || {};
  // MenuContent: "\(name)  \(percent) · \(reset)" as one line.
  const info = (name, w) => { const r = fmtReset(w.resetIn ?? w.reset).trim(); return { type: "info", label: `${name}  ${fmtPct(w.pct)}${r ? " · " + r : ""}` }; };
  const live = [];
  if (d.session) live.push(info("Session", d.session));
  if (d.weekly) live.push(info("Weekly", d.weekly));
  (d.models || []).forEach((m) => live.push(info(m.name, m)));

  const set = (key, val, hook, opt) => { s[key] = val; save(); hook ? hook(val) : opt && island.setOption && island.setOption(opt, val); };
  const mat = (m, label) => ({ type: "radio", label, checked: s.material === m, onSelect: () => set("material", m, hooks.onMaterial, "material") });

  return [
    ...live,
    { type: "sep" },
    { type: "action", label: "Refresh now", onSelect: () => (hooks.onRefresh ? hooks.onRefresh() : refresh(island)) },
    { type: "link", label: "Open usage on claude.ai", href: "https://claude.ai/settings/usage" },
    { type: "sep" },
    { type: "submenu", label: "Appearance", items: [mat("solid", "Solid"), mat("frosted", "Frosted"), mat("glass", "Liquid Glass")] },
    { type: "check", label: "Show percentages", checked: s.display === "percent", onSelect: (on) => set("display", on ? "percent" : "ticks", hooks.onDisplay, "display") },
    { type: "check", label: "Burn-rate estimates", checked: s.burnRate, onSelect: (on) => set("burnRate", on, hooks.onBurnRate, "burnRate") },
    { type: "check", label: "Usage notifications", checked: s.notifications, onSelect: (on) => set("notifications", on, hooks.onNotifications) },
    { type: "check", label: "Menu bar item", checked: s.menuBar, onSelect: (on) => set("menuBar", on, hooks.onMenuBar) },
    { type: "check", label: "Launch at login", checked: s.login, onSelect: (on) => { set("login", on, hooks.onLaunchAtLogin); if (on) toast("In the app, this opens Claude Meter when you log in."); } },
    { type: "sep" },
    { type: "action", label: "About Claude Meter", keepFocus: true, onSelect: () => about(island) },
    { type: "action", label: "Quit Claude Meter", keepFocus: true, onSelect: () => (hooks.onQuit ? hooks.onQuit() : island.quit && island.quit()) },
  ];
}

/**
 * attachMenu(island, hooks) → detach(). Opens the menu on the island's "contextmenu" event
 * (island.js emits it for right-click, Shift+F10, the ContextMenu key, long-press and the ⋯ button).
 */
export function attachMenu(island, hooks = {}) {
  const handler = (e = {}) => {
    const r = island.el.getBoundingClientRect();
    const x = e.clientX ?? e.x ?? r.left + r.width / 2;
    const y = e.clientY ?? e.y ?? r.bottom + 4;
    openMenu(island, { x, y, items: defaultItems(island, hooks), trigger: island.el.querySelector(".island__hit") });
  };
  island.on && island.on("contextmenu", handler);
  return () => island.off && island.off("contextmenu", handler);
}

/* Refresh now + the throttle easter egg (the app's real UsageModel.Status.throttled string). The app
   refetches quietly; a second refresh inside the 180s floor shows the throttle status in the bottom
   note, dim, with a fixed number (the app doesn't count it down), then the note clears. */
function refresh(island) {
  const now = Date.now();
  const st = island._refresh || (island._refresh = { last: 0, timer: 0, prev: undefined });
  const second = now - st.last < 10000;
  st.last = now;
  if (!island.update) return;
  if (!second) { island.update({ updated: "just now" }, { roll: false }); return; }
  clearTimeout(st.timer);
  if (st.prev === undefined) st.prev = island.data?.note ?? null;
  island.update({ note: { text: "just refreshed · updating in 180s", tone: "dim" } }, { roll: false });
  st.timer = setTimeout(() => { island.update({ note: st.prev }, { roll: false }); st.prev = undefined; }, 12000);
}

function about(island) {
  const card = el("div", "cm-about", { role: "dialog", "aria-modal": "true", "aria-label": "About Claude Meter", tabindex: "-1" });
  card.innerHTML = `<img src="/assets/icon-256.png" alt="" width="64" height="64"><p class="cm-about__name">Claude Meter</p><p class="cm-about__ver">Version 1.2 (3)</p><p class="cm-about__by">© 2026 Yiftach Freeman. Not affiliated with Anthropic.</p><button type="button" class="cm-about__ok">OK</button>`;
  document.body.append(card);
  const back = island?.el?.querySelector(".island__hit");
  const close = () => { card.remove(); document.removeEventListener("keydown", onKey, true); document.removeEventListener("pointerdown", onOut, true); back && back.focus({ preventScroll: true }); };
  const onKey = (e) => { if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); close(); } else if (e.key === "Tab") { e.preventDefault(); card.querySelector("button").focus(); } };
  const onOut = (e) => { if (!card.contains(e.target)) close(); };
  card.querySelector("button").addEventListener("click", close);
  document.addEventListener("keydown", onKey, true);
  setTimeout(() => document.addEventListener("pointerdown", onOut, true));
  card.querySelector("button").focus();
  if (!reduced()) gsap.fromTo(card, { scale: 0.96, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.18, ease: "settle" });
}
