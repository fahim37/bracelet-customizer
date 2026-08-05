"use client";

import Image from "next/image";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  BRACELET_COLORS,
  CHARMS,
  THEMES,
  WATCHES,
  type BraceletColorId,
  type Charm,
  type Metal,
  type Theme,
} from "./catalog";

type Placement = {
  instanceId: string;
  charmId: string;
  slot: number;
};

type DragPayload =
  | { type: "catalog"; charmId: string }
  | { type: "placed"; instanceId: string };

type SavedBuilder = {
  placements: Placement[];
  braceletColor: BraceletColorId;
  watchId: string | null;
  freeClaimed: boolean;
  giftColor: BraceletColorId;
};

const STORAGE_KEY = "atelier-bracelet-design-v1";
const DRAG_MIME = "application/x-charm-atelier";

const charmMap = new Map(CHARMS.map((charm) => [charm.id, charm]));
const watchMap = new Map(WATCHES.map((watch) => [watch.id, watch]));

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function createInstanceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `charm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function slotsFor(placement: Placement) {
  const charm = charmMap.get(placement.charmId);
  const span = charm?.span ?? 1;
  return Array.from({ length: span }, (_, index) => placement.slot + index);
}

function overlaps(placement: Placement, target: Set<number>) {
  return slotsFor(placement).some((slot) => target.has(slot));
}

function canStartAt(charm: Charm, slot: number, maxSlots: number, hasWatch: boolean) {
  if (slot < 0 || slot + charm.span > maxSlots) return false;
  return !(hasWatch && charm.span === 2 && slot === 5);
}

function firstOpenSlot(
  charm: Charm,
  placements: Placement[],
  maxSlots: number,
  hasWatch: boolean,
) {
  const occupied = new Set(placements.flatMap(slotsFor));
  for (let slot = 0; slot < maxSlots; slot += 1) {
    if (!canStartAt(charm, slot, maxSlots, hasWatch)) continue;
    const open = Array.from({ length: charm.span }, (_, index) => slot + index).every(
      (position) => !occupied.has(position),
    );
    if (open) return slot;
  }
  return null;
}

function repackPlacements(placements: Placement[], maxSlots: number, hasWatch: boolean) {
  const next: Placement[] = [];
  for (const placement of [...placements].sort((a, b) => a.slot - b.slot)) {
    const charm = charmMap.get(placement.charmId);
    if (!charm) continue;
    const desiredSlots = new Set(
      Array.from({ length: charm.span }, (_, index) => placement.slot + index),
    );
    const desiredIsOpen =
      canStartAt(charm, placement.slot, maxSlots, hasWatch) &&
      !next.some((item) => overlaps(item, desiredSlots));
    const slot = desiredIsOpen
      ? placement.slot
      : firstOpenSlot(charm, next, maxSlots, hasWatch);
    if (slot !== null) next.push({ ...placement, slot });
  }
  return next;
}

function Icon({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </svg>
  );
}

function SearchIcon() {
  return (
    <Icon>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </Icon>
  );
}

function ChevronIcon() {
  return (
    <Icon size={16}>
      <path d="m7 9.5 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    </Icon>
  );
}

function CloseIcon() {
  return (
    <Icon>
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </Icon>
  );
}

function TrashIcon() {
  return (
    <Icon size={18}>
      <path d="M5 7h14M9 4h6l1 3H8l1-3Zm-1 6v8m4-8v8m4-8v8M7 7l1 13h8l1-13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </Icon>
  );
}

function ResetIcon() {
  return (
    <Icon size={18}>
      <path d="M5 8V4m0 0h4M5 4l3.1 3A7 7 0 1 1 5.4 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
    </Icon>
  );
}

function BagIcon() {
  return (
    <Icon size={19}>
      <path d="M5 8h14l-1 12H6L5 8Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </Icon>
  );
}

function Modal({
  children,
  className = "",
  onClose,
}: {
  children: ReactNode;
  className?: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose} role="presentation">
      <div
        aria-modal="true"
        className={`modal-card ${className}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}

export default function BraceletBuilder() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [braceletColor, setBraceletColor] = useState<BraceletColorId>("silver");
  const [watchId, setWatchId] = useState<string | null>(null);
  const [activeThemes, setActiveThemes] = useState<Theme[]>([]);
  const [activeMetals, setActiveMetals] = useState<Metal[]>([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<"theme" | "metal" | "mode" | "color" | null>(null);
  const [selectedCharmId, setSelectedCharmId] = useState<string | null>(null);
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [helpStep, setHelpStep] = useState<1 | 2 | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftColor, setGiftColor] = useState<BraceletColorId>("silver");
  const [freeClaimed, setFreeClaimed] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedWatch = watchId ? watchMap.get(watchId) ?? null : null;
  const selectedColor =
    BRACELET_COLORS.find((color) => color.id === braceletColor) ?? BRACELET_COLORS[0];
  const maxSlots = selectedWatch ? 13 : 16;
  const selectedCharm = selectedCharmId ? charmMap.get(selectedCharmId) ?? null : null;
  const overlayOpen = Boolean(
    selectedCharm || resetOpen || helpStep || giftOpen || checkoutOpen || mobileCartOpen,
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!overlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [overlayOpen]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const value = JSON.parse(saved) as SavedBuilder;
          const hasWatch = Boolean(value.watchId && watchMap.has(value.watchId));
          const savedMax = hasWatch ? 13 : 16;
          setWatchId(hasWatch ? value.watchId : null);
          setBraceletColor(
            BRACELET_COLORS.some((color) => color.id === value.braceletColor)
              ? value.braceletColor
              : "silver",
          );
          setGiftColor(
            BRACELET_COLORS.some((color) => color.id === value.giftColor)
              ? value.giftColor
              : "silver",
          );
          const validPlacements = Array.isArray(value.placements)
            ? value.placements.filter((item) => charmMap.has(item.charmId))
            : [];
          const packed = repackPlacements(validPlacements, savedMax, hasWatch);
          setPlacements(packed);
          setFreeClaimed(Boolean(value.freeClaimed && packed.length >= 10));
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const value: SavedBuilder = {
      placements,
      braceletColor,
      watchId,
      freeClaimed,
      giftColor,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }, [braceletColor, freeClaimed, giftColor, hydrated, placements, watchId]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelectedCharmId(null);
      setResetOpen(false);
      setHelpStep(null);
      setGiftOpen(false);
      setCheckoutOpen(false);
      setOrderId(null);
      setActiveMenu(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  const occupied = useMemo(() => {
    const map = new Map<number, Placement>();
    for (const placement of placements) {
      for (const slot of slotsFor(placement)) map.set(slot, placement);
    }
    return map;
  }, [placements]);

  const filteredCharms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return CHARMS.filter((charm) => {
      const matchesQuery = !normalized || charm.name.toLowerCase().includes(normalized);
      const matchesTheme = !activeThemes.length || activeThemes.includes(charm.theme);
      const matchesMetal = !activeMetals.length || activeMetals.includes(charm.metal);
      return matchesQuery && matchesTheme && matchesMetal;
    });
  }, [activeMetals, activeThemes, query]);

  const sortedPlacements = useMemo(
    () => [...placements].sort((a, b) => a.slot - b.slot),
    [placements],
  );
  const charmTotal = placements.reduce(
    (sum, placement) => sum + (charmMap.get(placement.charmId)?.price ?? 0),
    0,
  );
  const basePrice = selectedWatch
    ? selectedWatch.price
    : freeClaimed
      ? 0
      : selectedColor.price;
  const total = basePrice + charmTotal;
  const promoProgress = Math.min(100, placements.length * 10);
  const remainingForGift = Math.max(0, 10 - placements.length);

  function putCharmAt(charm: Charm, slot: number, movingInstanceId?: string) {
    if (!canStartAt(charm, slot, maxSlots, Boolean(selectedWatch))) {
      showToast(
        charm.span === 2
          ? "This linked charm needs two adjacent links."
          : "That position is not available.",
      );
      return;
    }
    const targetSlots = new Set(
      Array.from({ length: charm.span }, (_, index) => slot + index),
    );
    const moving = movingInstanceId
        ? placements.find((item) => item.instanceId === movingInstanceId)
        : null;
    const withoutMoving = movingInstanceId
      ? placements.filter((item) => item.instanceId !== movingInstanceId)
      : placements;
    const withoutConflicts = withoutMoving.filter((item) => !overlaps(item, targetSlots));
    const next = [
      ...withoutConflicts,
      moving
        ? { ...moving, slot }
        : { instanceId: createInstanceId(), charmId: charm.id, slot },
    ];
    setPlacements(next);
    if (next.length < 10) setFreeClaimed(false);
    setDragOverSlot(null);
    showToast(movingInstanceId ? "Charm moved" : `${charm.name} added`);
  }

  function quickAdd(charm: Charm) {
    const slot = firstOpenSlot(charm, placements, maxSlots, Boolean(selectedWatch));
    if (slot === null) {
      showToast("Your bracelet is full. Remove a charm to add another.");
      return;
    }
    putCharmAt(charm, slot);
    setSelectedCharmId(null);
  }

  function removePlacement(instanceId: string) {
    const item = placements.find((placement) => placement.instanceId === instanceId);
    setPlacements((current) => current.filter((placement) => placement.instanceId !== instanceId));
    if (placements.length <= 10) setFreeClaimed(false);
    if (item) showToast(`${charmMap.get(item.charmId)?.name ?? "Charm"} removed`);
  }

  function changeMode(nextWatchId: string | null) {
    const hasWatch = Boolean(nextWatchId);
    const packed = repackPlacements(placements, hasWatch ? 13 : 16, hasWatch);
    setWatchId(nextWatchId);
    setPlacements(packed);
    if (packed.length < 10) setFreeClaimed(false);
    setActiveMenu(null);
    showToast(hasWatch ? "Watch bracelet selected" : "Original bracelet selected");
  }

  function readDrag(event: DragEvent) {
    try {
      const raw = event.dataTransfer.getData(DRAG_MIME);
      return raw ? (JSON.parse(raw) as DragPayload) : dragPayload;
    } catch {
      return dragPayload;
    }
  }

  function dropOnSlot(event: DragEvent, slot: number) {
    event.preventDefault();
    const payload = readDrag(event);
    if (!payload) return;
    if (payload.type === "catalog") {
      const charm = charmMap.get(payload.charmId);
      if (charm) putCharmAt(charm, slot);
    } else {
      const placement = placements.find((item) => item.instanceId === payload.instanceId);
      const charm = placement ? charmMap.get(placement.charmId) : null;
      if (charm) putCharmAt(charm, slot, payload.instanceId);
    }
    setDragPayload(null);
  }

  function dropInCatalog(event: DragEvent) {
    const payload = readDrag(event);
    if (payload?.type !== "placed") return;
    event.preventDefault();
    removePlacement(payload.instanceId);
    setDragPayload(null);
    setDragOverSlot(null);
  }

  function startDrag(event: DragEvent, payload: DragPayload, charm: Charm) {
    event.dataTransfer.effectAllowed = payload.type === "catalog" ? "copy" : "move";
    event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));

    const sourceImage = event.currentTarget.querySelector("img");
    if (sourceImage) {
      const ghost = document.createElement("div");
      const ghostImage = sourceImage.cloneNode(true) as HTMLImageElement;
      ghost.className = `drag-charm-ghost span-${charm.span} kind-${charm.kind}`;
      ghost.setAttribute("aria-hidden", "true");
      ghostImage.removeAttribute("style");
      ghost.appendChild(ghostImage);
      document.body.appendChild(ghost);
      event.dataTransfer.setDragImage(ghost, charm.span === 2 ? 64 : 32, 30);
      window.setTimeout(() => ghost.remove(), 0);
    }

    setDragPayload(payload);
  }

  function toggleTheme(theme: Theme) {
    setActiveThemes((current) =>
      current.includes(theme) ? current.filter((item) => item !== theme) : [...current, theme],
    );
  }

  function toggleMetal(metal: Metal) {
    setActiveMetals((current) =>
      current.includes(metal) ? current.filter((item) => item !== metal) : [...current, metal],
    );
  }

  function clearFilters() {
    setQuery("");
    setActiveThemes([]);
    setActiveMetals([]);
    setSearchOpen(false);
    setActiveMenu(null);
  }

  function resetBuilder() {
    setPlacements([]);
    setWatchId(null);
    setFreeClaimed(false);
    setGiftColor("silver");
    setResetOpen(false);
    setMobileCartOpen(false);
    showToast("Your bracelet has been reset");
  }

  function claimGift() {
    setFreeClaimed(true);
    if (!selectedWatch) setBraceletColor(giftColor);
    setGiftOpen(false);
    showToast("Your free bracelet is in the bag");
  }

  function placeOrder() {
    const id = `CA-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const summary = {
      id,
      createdAt: new Date().toISOString(),
      braceletColor,
      watchId,
      placements,
      giftColor: freeClaimed ? giftColor : null,
      total,
    };
    localStorage.setItem("atelier-last-order", JSON.stringify(summary));
    setOrderId(id);
  }

  async function copyDesign() {
    const lines = sortedPlacements.map((placement) => {
      const charm = charmMap.get(placement.charmId);
      return `${placement.slot + 1}. ${charm?.name ?? "Charm"}`;
    });
    const text = [
      selectedWatch?.name ?? `${selectedColor.label} Original Bracelet`,
      ...lines,
      `Total: ${money(total)}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    showToast("Design summary copied");
  }

  const relatedCharms = selectedCharm
    ? [
        ...CHARMS.filter(
          (charm) => charm.theme === selectedCharm.theme && charm.id !== selectedCharm.id,
        ),
        ...CHARMS.filter(
          (charm) => charm.theme !== selectedCharm.theme && charm.id !== selectedCharm.id,
        ),
      ]
    : [];

  return (
    <div className="builder-app">
      <header className="site-header">
        <div className="brand-lockup">
          <span className="brand-mark">CA</span>
          <span className="brand-name">Charm Atelier</span>
        </div>
        <p className="site-title">Create your story</p>
        <div className="header-meta">
          <span>{placements.length} charms</span>
          <span className="header-divider" />
          <span>{money(total)}</span>
        </div>
      </header>

      <div className="builder-layout">
        <main className="builder-main">
          <section className="workbench" aria-label="Bracelet builder">
            <div className="workbench-toolbar">
              <div className="toolbar-group">
                <div className="select-wrap">
                  <button
                    aria-expanded={activeMenu === "mode"}
                    className="pill-select mode-select"
                    onClick={() => setActiveMenu(activeMenu === "mode" ? null : "mode")}
                    type="button"
                  >
                    {selectedWatch ? (
                      <Image alt="" height={28} src={selectedWatch.image} unoptimized width={28} />
                    ) : (
                      <span className={`tiny-link metal-${braceletColor}`} />
                    )}
                    <span>{selectedWatch ? selectedWatch.name : "Original Bracelet"}</span>
                    <ChevronIcon />
                  </button>
                  {activeMenu === "mode" && (
                    <div className="select-menu mode-menu">
                      <button className={!selectedWatch ? "is-selected" : ""} onClick={() => changeMode(null)} type="button">
                        <span className={`menu-thumbnail metal-${braceletColor}`} />
                        <span><strong>Original Bracelet</strong><small>16 charm positions</small></span>
                      </button>
                      {WATCHES.map((watch) => (
                        <button className={watch.id === watchId ? "is-selected" : ""} key={watch.id} onClick={() => changeMode(watch.id)} type="button">
                          <Image alt="" height={42} src={watch.image} unoptimized width={42} />
                          <span><strong>{watch.name}</strong><small>{money(watch.price)} · 13 positions</small></span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!selectedWatch && (
                  <div className="select-wrap">
                    <button
                      aria-expanded={activeMenu === "color"}
                      className="pill-select color-select"
                      onClick={() => setActiveMenu(activeMenu === "color" ? null : "color")}
                      type="button"
                    >
                      <span className="color-swatch" style={{ background: selectedColor.swatch }} />
                      Color: {selectedColor.label}
                      <ChevronIcon />
                    </button>
                    {activeMenu === "color" && (
                      <div className="select-menu color-menu">
                        {BRACELET_COLORS.map((color) => (
                          <button
                            className={color.id === braceletColor ? "is-selected" : ""}
                            key={color.id}
                            onClick={() => {
                              setBraceletColor(color.id);
                              setActiveMenu(null);
                            }}
                            type="button"
                          >
                            <span className="color-swatch" style={{ background: color.swatch }} />
                            <span>{color.label}</span>
                            <small>{money(color.price)}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="workbench-actions">
                <div className={`search-control ${searchOpen ? "is-open" : ""}`}>
                  {searchOpen && (
                    <input
                      aria-label="Search charms"
                      autoFocus
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search charms..."
                      type="search"
                      value={query}
                    />
                  )}
                  <button aria-label="Search" onClick={() => setSearchOpen(!searchOpen)} type="button">
                    <SearchIcon />
                  </button>
                </div>
                <button className="action-button" onClick={() => setResetOpen(true)} type="button">
                  <span>Reset</span><ResetIcon />
                </button>
                <button aria-label="How it works" className="circle-button" onClick={() => setHelpStep(1)} type="button">?</button>
              </div>
            </div>

            <div className="stage-copy">
              <div>
                <span className="eyebrow">Your canvas</span>
                <h1>Make it unmistakably yours.</h1>
              </div>
              <p>Drag a charm onto any open link, or tap a charm to add it.</p>
            </div>

            <div className="bracelet-scroll">
              <div className={`bracelet-row metal-${selectedWatch ? selectedWatch.metal.toLowerCase() : braceletColor}`}>
                <div className="bracelet-rail" />
                {Array.from({ length: maxSlots }, (_, slot) => {
                  const placement = occupied.get(slot);
                  const isAnchor = placement?.slot === slot;
                  const charm = placement ? charmMap.get(placement.charmId) : null;
                  return (
                    <Fragment key={slot}>
                      {selectedWatch && slot === 6 && (
                        <div className="watch-on-bracelet">
                          <Image alt={selectedWatch.name} fill sizes="140px" src={selectedWatch.image} unoptimized />
                        </div>
                      )}
                      <div
                        aria-label={
                          charm
                            ? `${charm.name}, position ${slot + 1}`
                            : `Empty bracelet position ${slot + 1}`
                        }
                        className={`bracelet-slot ${dragOverSlot === slot ? "is-drag-over" : ""} ${placement ? "is-occupied" : ""} ${placement && !isAnchor ? "is-reserved" : ""} ${charm ? `kind-${charm.kind} span-${charm.span}` : ""}`}
                        draggable={Boolean(placement && isAnchor)}
                        onDoubleClick={() => placement && removePlacement(placement.instanceId)}
                        onDragEnd={() => {
                          setDragPayload(null);
                          setDragOverSlot(null);
                        }}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          setDragOverSlot(slot);
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDragStart={(event) => {
                          if (placement && isAnchor && charm) {
                            startDrag(
                              event,
                              { type: "placed", instanceId: placement.instanceId },
                              charm,
                            );
                          }
                        }}
                        onDrop={(event) => dropOnSlot(event, slot)}
                        onKeyDown={(event) => {
                          if (!placement) return;
                          if (event.key === "Delete" || event.key === "Backspace") {
                            removePlacement(placement.instanceId);
                          }
                          if (event.key === "Enter" && charm) setSelectedCharmId(charm.id);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {!placement && <span className="slot-plus">+</span>}
                        {charm && isAnchor && (
                          <button
                            className={`placed-charm span-${charm.span} kind-${charm.kind}`}
                            onClick={() => setSelectedCharmId(charm.id)}
                            title={`${charm.name} · double-click the link to remove`}
                            type="button"
                          >
                            <Image alt={charm.name} fill sizes={charm.span === 2 ? "132px" : "66px"} src={charm.image} unoptimized />
                          </button>
                        )}
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            </div>

            <div className="stage-status">
              <span><strong>{placements.length}</strong> of {maxSlots} charms</span>
              <span className="status-line" />
              <span>{maxSlots - new Set(placements.flatMap(slotsFor)).size} open links</span>
              <span className="drag-tip">Drag a placed charm back to the catalog to remove it</span>
            </div>
          </section>

          <section
            className={`catalog-section ${dragPayload?.type === "placed" ? "is-return-target" : ""}`}
            aria-label="Charm catalog"
            onDragEnter={() => {
              if (dragPayload?.type === "placed") setDragOverSlot(null);
            }}
            onDragOver={(event) => {
              if (dragPayload?.type !== "placed") return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={dropInCatalog}
          >
            <div className="catalog-toolbar">
              <div className="filter-actions">
                <div className="filter-wrap">
                  <button aria-expanded={activeMenu === "theme"} className="filter-button" onClick={() => setActiveMenu(activeMenu === "theme" ? null : "theme")} type="button">
                    Theme {activeThemes.length > 0 && <span>{activeThemes.length}</span>}<ChevronIcon />
                  </button>
                  {activeMenu === "theme" && (
                    <div className="filter-menu theme-filter-menu">
                      <p>Shop by story</p>
                      <div>
                        {THEMES.map((theme) => (
                          <label key={theme}>
                            <input checked={activeThemes.includes(theme)} onChange={() => toggleTheme(theme)} type="checkbox" />
                            <span>{theme}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="filter-wrap">
                  <button aria-expanded={activeMenu === "metal"} className="filter-button" onClick={() => setActiveMenu(activeMenu === "metal" ? null : "metal")} type="button">
                    Charms Color {activeMetals.length > 0 && <span>{activeMetals.length}</span>}<ChevronIcon />
                  </button>
                  {activeMenu === "metal" && (
                    <div className="filter-menu metal-filter-menu">
                      <p>Choose a finish</p>
                      {(["Silver", "Gold", "Rose Gold"] as Metal[]).map((metal) => (
                        <label key={metal}>
                          <input checked={activeMetals.includes(metal)} onChange={() => toggleMetal(metal)} type="checkbox" />
                          <span className={`metal-dot dot-${metal.toLowerCase().replace(" ", "-")}`} />
                          <span>{metal}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {(query || activeThemes.length > 0 || activeMetals.length > 0) && (
                  <button className="clear-filters" onClick={clearFilters} type="button">Clear filters <CloseIcon /></button>
                )}
              </div>
              <button className="how-link" onClick={() => setHelpStep(1)} type="button">Help / How it works <span>i</span></button>
            </div>

            {dragPayload?.type === "placed" && (
              <div className="return-drop-notice" role="status">
                <span>↓</span> Release here to remove the charm
              </div>
            )}

            <div className="catalog-meta">
              <p><strong>{filteredCharms.length}</strong> charms</p>
              <p>Drag to place · tap to preview</p>
            </div>

            {filteredCharms.length ? (
              <div className="charm-grid">
                {filteredCharms.map((charm) => (
                  <article
                    aria-label={`${charm.name}, ${money(charm.price)}`}
                    className={`charm-card kind-${charm.kind}`}
                    draggable
                    key={charm.id}
                    onClick={() => setSelectedCharmId(charm.id)}
                    onDragEnd={() => setDragPayload(null)}
                    onDragStart={(event) =>
                      startDrag(event, { type: "catalog", charmId: charm.id }, charm)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") setSelectedCharmId(charm.id);
                    }}
                    role="button"
                    tabIndex={0}
                    title={`${charm.name} — ${money(charm.price)}`}
                  >
                    <div className="charm-image-wrap">
                      <Image alt={charm.name} fill sizes="(max-width: 700px) 25vw, 130px" src={charm.image} unoptimized />
                    </div>
                    {charm.kind !== "simple" && <span className="kind-badge">{charm.kind === "hanging" ? "Drop" : "2 links"}</span>}
                    <div className="card-tooltip">
                      <strong>{charm.name}</strong>
                      <span>{charm.metal} · {money(charm.price)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-results">
                <span>✦</span>
                <h2>No charms found</h2>
                <p>Try another search or clear your filters.</p>
                <button onClick={clearFilters} type="button">Show all charms</button>
              </div>
            )}
          </section>
        </main>

        {mobileCartOpen && <button aria-label="Close cart" className="cart-backdrop" onClick={() => setMobileCartOpen(false)} type="button" />}
        <aside className={`cart-panel ${mobileCartOpen ? "is-open" : ""}`} aria-label="Your bracelet">
          <div className="cart-drag-handle" />
          <div className="promo-card">
            <div className="promo-heading">
              <span className="gift-icon">✦</span>
              <div>
                <strong>{remainingForGift > 0 ? "A free bracelet is within reach" : "Your free bracelet is unlocked"}</strong>
                <p>{remainingForGift > 0 ? `Add ${remainingForGift} more ${remainingForGift === 1 ? "charm" : "charms"}` : "Choose your complimentary color"}</p>
              </div>
            </div>
            <div className="progress-track"><span style={{ width: `${promoProgress}%` }} /></div>
            {remainingForGift === 0 && (
              <button className={freeClaimed ? "gift-claimed" : "claim-gift"} onClick={() => setGiftOpen(true)} type="button">
                {freeClaimed ? `Free ${BRACELET_COLORS.find((color) => color.id === giftColor)?.label} bracelet added` : "Claim free bracelet"}
              </button>
            )}
          </div>

          <div className="cart-scroll">
            <div className="cart-section-heading"><h2>Your {selectedWatch ? "watch" : "bracelet"}</h2></div>
            <div className="base-cart-item">
              <div className={`base-cart-image metal-${selectedWatch ? selectedWatch.metal.toLowerCase() : braceletColor}`}>
                {selectedWatch ? (
                  <Image alt={selectedWatch.name} fill sizes="72px" src={selectedWatch.image} unoptimized />
                ) : (
                  <span className="base-link-art" />
                )}
              </div>
              <div>
                <strong>{selectedWatch?.name ?? (freeClaimed ? "Free Charm Bracelet" : "Original Bracelet")}</strong>
                <span>{selectedWatch?.metal ?? selectedColor.label}</span>
              </div>
              <p>{basePrice === 0 ? <><s>{money(selectedColor.price)}</s> Free</> : money(basePrice)}</p>
            </div>

            {selectedWatch && freeClaimed && (
              <div className="free-gift-item">
                <span className={`mini-bracelet metal-${giftColor}`} />
                <div><strong>Free Charm Bracelet</strong><small>{BRACELET_COLORS.find((color) => color.id === giftColor)?.label}</small></div>
                <b>FREE</b>
              </div>
            )}

            <div className="cart-section-heading charm-heading">
              <h2>Your charms</h2><span>{placements.length}/{maxSlots}</span>
            </div>

            <div className="cart-items">
              {sortedPlacements.length ? sortedPlacements.map((placement) => {
                const charm = charmMap.get(placement.charmId);
                if (!charm) return null;
                return (
                  <div
                    className="cart-item"
                    draggable
                    key={placement.instanceId}
                    onDragEnd={() => setDragPayload(null)}
                    onDragStart={(event) =>
                      startDrag(
                        event,
                        { type: "placed", instanceId: placement.instanceId },
                        charm,
                      )
                    }
                  >
                    <button className="cart-item-image" onClick={() => setSelectedCharmId(charm.id)} type="button">
                      <Image alt={charm.name} fill sizes="58px" src={charm.image} unoptimized />
                    </button>
                    <div className="cart-item-info">
                      <strong>{charm.name}</strong>
                      <span><i /> Available</span>
                      <small>Position {placement.slot + 1}/{maxSlots}{charm.span === 2 ? " · 2 links" : ""}</small>
                    </div>
                    <div className="cart-item-price">
                      <b>{money(charm.price)}</b>
                      <button aria-label={`Remove ${charm.name}`} onClick={() => removePlacement(placement.instanceId)} type="button"><TrashIcon /></button>
                    </div>
                  </div>
                );
              }) : (
                <div className="empty-cart">
                  <span>+</span>
                  <p>Your story starts here.</p>
                  <small>Drag or tap any charm to begin.</small>
                </div>
              )}
            </div>
          </div>

          <div className="cart-footer">
            <div className="total-row"><span>Total</span><strong>{money(total)}</strong></div>
            <p>Taxes and shipping calculated at checkout.</p>
            <button className="checkout-button" onClick={() => { setOrderId(null); setCheckoutOpen(true); }} type="button">
              Check out <span>→</span>
            </button>
            <button className="copy-button" onClick={copyDesign} type="button">Copy design summary</button>
          </div>
        </aside>
      </div>

      <div className="mobile-cart-bar">
        <button aria-expanded={mobileCartOpen} className="mobile-cart-toggle" onClick={() => setMobileCartOpen(!mobileCartOpen)} type="button">
          <span className="mobile-bag"><BagIcon /><b>{placements.length}</b></span>
          <span><small>Your bracelet</small><strong>{money(total)}</strong></span>
          <ChevronIcon />
        </button>
        <button className="mobile-checkout" onClick={() => setCheckoutOpen(true)} type="button">Checkout</button>
      </div>

      {selectedCharm && (
        <div className="details-backdrop" onMouseDown={() => setSelectedCharmId(null)}>
          <section className="details-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <button aria-label="Close charm details" className="drawer-close" onClick={() => setSelectedCharmId(null)} type="button"><CloseIcon /></button>
            <div className="details-hero">
              <Image alt={selectedCharm.name} fill sizes="320px" src={selectedCharm.image} unoptimized />
            </div>
            <div className="details-copy">
              <span className="eyebrow">{selectedCharm.theme} · {selectedCharm.metal}</span>
              <h2>{selectedCharm.name}</h2>
              <div className="details-price"><strong>{money(selectedCharm.price)}</strong><span><i /> Ready to add</span></div>
              <p>{selectedCharm.span === 2 ? "This statement piece flows across two bracelet links." : selectedCharm.kind === "hanging" ? "A hanging charm designed to add movement to your story." : "A classic Italian link charm, made to mix, match, and make your own."}</p>
              <button className="add-charm-button" onClick={() => quickAdd(selectedCharm)} type="button">Add charm <span>+</span></button>
              <p className="add-note">We’ll place it in the first available position. You can drag it anywhere after.</p>
            </div>
            <div className="related-block">
              <div className="related-heading">
                <div><span className="eyebrow">Complete the story</span><h3>You might also like</h3></div>
                <span>{relatedCharms.length} charms</span>
              </div>
              <div className="related-row">
                {relatedCharms.map((charm) => (
                  <button aria-label={`View ${charm.name}`} key={charm.id} onClick={() => setSelectedCharmId(charm.id)} title={charm.name} type="button">
                    <span><Image alt={charm.name} fill sizes="84px" src={charm.image} unoptimized /></span>
                    <small>{money(charm.price)}</small>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {resetOpen && (
        <Modal className="confirm-modal" onClose={() => setResetOpen(false)}>
          <span className="modal-symbol">↺</span>
          <span className="eyebrow">Start fresh</span>
          <h2>Reset your bracelet?</h2>
          <p>This removes every charm and returns to the original bracelet. Your color choice will stay.</p>
          <div className="modal-actions">
            <button className="secondary-button" onClick={() => setResetOpen(false)} type="button">Keep designing</button>
            <button className="danger-button" onClick={resetBuilder} type="button">Reset bracelet</button>
          </div>
        </Modal>
      )}

      {helpStep && (
        <Modal className="help-modal" onClose={() => setHelpStep(null)}>
          <button aria-label="Close help" className="modal-close" onClick={() => setHelpStep(null)} type="button"><CloseIcon /></button>
          <span className="eyebrow">How it works</span>
          <div className="help-progress"><span className={helpStep === 1 ? "active" : ""} /><span className={helpStep === 2 ? "active" : ""} /></div>
          {helpStep === 1 ? (
            <>
              <div className="help-visual drag-visual"><span className="help-charm">✦</span><span className="help-path" /><span className="help-link">+</span></div>
              <h2>Build by drag, drop, or tap.</h2>
              <p>Drag any charm into an empty link. On touch devices, tap a charm and choose “Add charm.” Your bag and total update instantly.</p>
              <button className="primary-button" onClick={() => setHelpStep(2)} type="button">Next <span>→</span></button>
            </>
          ) : (
            <>
              <div className="help-visual arrange-visual">
                <span>1</span><span>2</span><span className="arranged">✦</span><span>4</span><span>5</span>
              </div>
              <h2>Arrange it until it feels right.</h2>
              <p>Drag placed charms to reorder them, or pull one back into the catalog to remove it. Then use filters to find the perfect finish and review everything in your bag.</p>
              <div className="help-actions"><button className="secondary-button" onClick={() => setHelpStep(1)} type="button">Back</button><button className="primary-button" onClick={() => setHelpStep(null)} type="button">Start creating</button></div>
            </>
          )}
        </Modal>
      )}

      {giftOpen && (
        <Modal className="gift-modal" onClose={() => setGiftOpen(false)}>
          <button aria-label="Close gift selection" className="modal-close" onClick={() => setGiftOpen(false)} type="button"><CloseIcon /></button>
          <span className="gift-burst">✦</span>
          <span className="eyebrow">You made it</span>
          <h2>Choose your free bracelet.</h2>
          <p>Ten charms unlock one original bracelet, on us.</p>
          <div className="gift-colors">
            {BRACELET_COLORS.map((color) => (
              <button className={giftColor === color.id ? "is-selected" : ""} key={color.id} onClick={() => setGiftColor(color.id)} type="button">
                <span className={`gift-bracelet metal-${color.id}`}><i /><i /><i /><i /></span>
                <strong>{color.label}</strong>
                <small>Free <s>{money(color.price)}</s></small>
              </button>
            ))}
          </div>
          <button className="primary-button full-button" onClick={claimGift} type="button">{freeClaimed ? "Update free bracelet" : "Add free bracelet"}</button>
        </Modal>
      )}

      {checkoutOpen && (
        <Modal className="checkout-modal" onClose={() => { setCheckoutOpen(false); setOrderId(null); }}>
          <button aria-label="Close checkout" className="modal-close" onClick={() => { setCheckoutOpen(false); setOrderId(null); }} type="button"><CloseIcon /></button>
          {orderId ? (
            <div className="order-success">
              <span className="success-check">✓</span>
              <span className="eyebrow">Design saved</span>
              <h2>Your story is ready.</h2>
              <p>Configuration <strong>{orderId}</strong> has been saved in this browser.</p>
              <button className="primary-button full-button" onClick={() => { setCheckoutOpen(false); setOrderId(null); }} type="button">Keep designing</button>
              <small>Connect this front end to your Shopify or commerce backend to collect payment and create live orders.</small>
            </div>
          ) : (
            <>
              <span className="eyebrow">Final look</span>
              <h2>Review your bracelet</h2>
              <div className="checkout-preview">
                {sortedPlacements.slice(0, 8).map((placement) => {
                  const charm = charmMap.get(placement.charmId);
                  return charm ? <span key={placement.instanceId}><Image alt={charm.name} fill sizes="52px" src={charm.image} unoptimized /></span> : null;
                })}
                {!placements.length && <p>No charms added yet</p>}
              </div>
              <div className="checkout-lines">
                <p><span>{selectedWatch?.name ?? `${selectedColor.label} bracelet`}</span><strong>{money(basePrice)}</strong></p>
                <p><span>{placements.length} {placements.length === 1 ? "charm" : "charms"}</span><strong>{money(charmTotal)}</strong></p>
                {freeClaimed && selectedWatch && <p className="free-line"><span>Free bracelet</span><strong>FREE</strong></p>}
                <p className="checkout-total"><span>Total</span><strong>{money(total)}</strong></p>
              </div>
              <button className="primary-button full-button" onClick={placeOrder} type="button">Save order configuration <span>→</span></button>
              <p className="checkout-disclaimer">This is a functional front-end checkout handoff. Payment requires your store backend credentials.</p>
            </>
          )}
        </Modal>
      )}

      <div aria-live="polite" className={`toast ${toast ? "is-visible" : ""}`}>
        <span>✓</span>{toast}
      </div>
    </div>
  );
}
