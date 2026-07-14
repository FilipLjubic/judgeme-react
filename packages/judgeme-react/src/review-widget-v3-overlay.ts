const REVIEW_WIDGET_V3_WRITE_BUTTON_SELECTOR =
  '[data-testid="write-review-button"]';
const REVIEW_WIDGET_V3_OVERLAY_SELECTOR =
  ".jdgm-review-widget-modal.jdgm-write-review-modal";
const REVIEW_WIDGET_V3_CLOSE_SELECTOR = [
  ".jdgm-write-review-modal__close-btn",
  ".jdgm-write-review-modal__nav-btn-close",
].join(",");
const REVIEW_WIDGET_V3_OVERLAY_OWNER_ATTRIBUTE =
  "data-judgeme-react-review-widget-owner";
const DEFAULT_CLOSE_SETTLE_DELAY_MS = 100;
const DEFAULT_CLOSE_FALLBACK_DELAY_MS = 1_200;
const DEFAULT_PENDING_OPEN_DELAY_MS = 11_000;

type TimerHandle = ReturnType<typeof setTimeout>;

export interface ReviewWidgetV3OverlayControllerOptions {
  cancelTimer?: (handle: TimerHandle) => void;
  closeFallbackDelayMs?: number;
  closeSettleDelayMs?: number;
  ownerId: string;
  pendingOpenDelayMs?: number;
  releaseKeyboardHandler: () => void;
  scheduleTimer?: (callback: () => void, delayMs: number) => TimerHandle;
}

export interface ReviewWidgetV3OverlayController {
  arm: () => void;
  beginClose: (overlay?: HTMLElement) => void;
  claimOverlay: (overlay: HTMLElement) => "claimed" | "ignored" | "removed";
  dispose: () => number;
  handleRemovedOverlay: (overlay: HTMLElement) => void;
  markOpened: (overlay: HTMLElement) => void;
  owns: (overlay: HTMLElement) => boolean;
}

/**
 * Tracks the document-level modal created by Judge.me's v3 Review Widget.
 *
 * Judge.me removes the visible modal on close, then immediately sets up a new
 * hidden modal outside the widget root. This controller keeps that shared DOM
 * owned by the package without replacing Judge.me's form implementation.
 */
export function createReviewWidgetV3OverlayController({
  cancelTimer = clearTimeout,
  closeFallbackDelayMs = DEFAULT_CLOSE_FALLBACK_DELAY_MS,
  closeSettleDelayMs = DEFAULT_CLOSE_SETTLE_DELAY_MS,
  ownerId,
  pendingOpenDelayMs = DEFAULT_PENDING_OPEN_DELAY_MS,
  releaseKeyboardHandler,
  scheduleTimer = setTimeout,
}: ReviewWidgetV3OverlayControllerOptions): ReviewWidgetV3OverlayController {
  const ownedOverlays = new Set<HTMLElement>();
  const openedOverlays = new Set<HTMLElement>();
  let armed = false;
  let closing = false;
  let disposed = false;
  let closeTimer: TimerHandle | undefined;

  const clearCloseTimer = () => {
    if (closeTimer === undefined) return;
    cancelTimer(closeTimer);
    closeTimer = undefined;
  };

  const releaseOwnedOverlays = () => {
    for (const overlay of ownedOverlays) {
      if (overlay.isConnected) overlay.remove();
    }
    ownedOverlays.clear();
    openedOverlays.clear();
  };

  const settleClose = () => {
    closeTimer = undefined;

    for (const overlay of ownedOverlays) {
      if (!overlay.isConnected) {
        ownedOverlays.delete(overlay);
        openedOverlays.delete(overlay);
      }
    }

    const visibleReplacement = [...ownedOverlays].some(isOverlayVisible);
    if (visibleReplacement) {
      // Judge.me's preview verification flow closes and intentionally reopens
      // the same form. Keep ownership when the replacement became visible.
      closing = false;
      return;
    }

    const hadOwnedOverlay = ownedOverlays.size > 0 || closing;
    closing = false;
    armed = false;
    releaseOwnedOverlays();
    if (hadOwnedOverlay) releaseKeyboardHandler();
  };

  const scheduleClose = (delayMs: number) => {
    clearCloseTimer();
    closeTimer = scheduleTimer(settleClose, delayMs);
  };

  const controller: ReviewWidgetV3OverlayController = {
    arm() {
      if (disposed) return;
      armed = true;
    },

    beginClose(overlay) {
      if (disposed) return;
      const hasOpenOverlay = [...ownedOverlays].some(
        (candidate) =>
          candidate.isConnected &&
          (openedOverlays.has(candidate) || isOverlayVisible(candidate)),
      );
      if (overlay ? !ownedOverlays.has(overlay) : !hasOpenOverlay) return;

      closing = true;
      scheduleClose(closeFallbackDelayMs);
    },

    claimOverlay(overlay) {
      if (disposed) {
        overlay.setAttribute(REVIEW_WIDGET_V3_OVERLAY_OWNER_ATTRIBUTE, ownerId);
        overlay.remove();
        releaseKeyboardHandler();
        return "removed";
      }
      if (!armed && !closing) return "ignored";

      overlay.setAttribute(REVIEW_WIDGET_V3_OVERLAY_OWNER_ATTRIBUTE, ownerId);
      ownedOverlays.add(overlay);
      if (isOverlayVisible(overlay)) openedOverlays.add(overlay);
      return "claimed";
    },

    dispose() {
      if (disposed) return 0;

      const ownedCount = ownedOverlays.size;
      const wasClosing = closing;
      const pendingOpen = armed && ownedCount === 0;
      disposed = true;
      armed = false;
      closing = false;
      clearCloseTimer();
      releaseOwnedOverlays();
      if (ownedCount > 0 || wasClosing) releaseKeyboardHandler();

      if (pendingOpen) return pendingOpenDelayMs;
      if (ownedCount > 0 || wasClosing) return closeFallbackDelayMs;
      return 0;
    },

    handleRemovedOverlay(overlay) {
      if (!ownedOverlays.has(overlay)) return;
      if (!closing && !openedOverlays.has(overlay)) return;

      closing = true;
      scheduleClose(closeSettleDelayMs);
    },

    markOpened(overlay) {
      if (!ownedOverlays.has(overlay)) {
        const result = controller.claimOverlay(overlay);
        if (result !== "claimed") return;
      }
      openedOverlays.add(overlay);
    },

    owns(overlay) {
      return ownedOverlays.has(overlay);
    },
  };

  return controller;
}

let overlayOwnerSequence = 0;

/** Binds package ownership to overlays opened from one v3 Review Widget root. */
export function bindReviewWidgetV3OverlayLifecycle(
  container: HTMLElement,
): () => void {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof MutationObserver === "undefined"
  ) {
    return () => undefined;
  }

  const ownerId = `review-widget-v3-${++overlayOwnerSequence}`;
  let disposed = false;
  let observerDisconnectTimer: number | undefined;
  const controller = createReviewWidgetV3OverlayController({
    ownerId,
    releaseKeyboardHandler: releaseReviewModalKeyboardHandler,
    scheduleTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
    cancelTimer: (handle) => window.clearTimeout(handle),
  });

  const observer = new MutationObserver((records) => {
    const addedOverlays = records.flatMap((record) =>
      Array.from(record.addedNodes).flatMap(collectReviewWidgetV3Overlays),
    );
    const removedOverlays = records.flatMap((record) =>
      Array.from(record.removedNodes).flatMap(collectReviewWidgetV3Overlays),
    );

    let removedAfterDispose = false;
    for (const overlay of addedOverlays) {
      removedAfterDispose =
        controller.claimOverlay(overlay) === "removed" || removedAfterDispose;
    }
    for (const overlay of removedOverlays) {
      controller.handleRemovedOverlay(overlay);
    }
    for (const record of records) {
      if (
        record.type === "attributes" &&
        record.target instanceof HTMLElement &&
        record.target.matches(REVIEW_WIDGET_V3_OVERLAY_SELECTOR) &&
        controller.owns(record.target) &&
        isOverlayVisible(record.target)
      ) {
        controller.markOpened(record.target);
      }
    }

    if (disposed && removedAfterDispose) {
      if (observerDisconnectTimer !== undefined) {
        window.clearTimeout(observerDisconnectTimer);
      }
      observerDisconnectTimer = window.setTimeout(
        () => observer.disconnect(),
        0,
      );
    }
  });

  const handleContainerClick = (event: Event) => {
    const target = getEventElement(event);
    const writeButton = target?.closest(
      REVIEW_WIDGET_V3_WRITE_BUTTON_SELECTOR,
    );
    if (writeButton && container.contains(writeButton)) controller.arm();
  };
  const handleDocumentClick = (event: Event) => {
    const target = getEventElement(event);
    const overlay = target?.closest<HTMLElement>(
      REVIEW_WIDGET_V3_OVERLAY_SELECTOR,
    );
    if (
      overlay &&
      target?.closest(REVIEW_WIDGET_V3_CLOSE_SELECTOR) &&
      controller.owns(overlay)
    ) {
      controller.beginClose(overlay);
    }
  };
  const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") controller.beginClose();
  };
  const handleModalOpened = (event: Event) => {
    const overlay = getEventElement(event)?.closest<HTMLElement>(
      REVIEW_WIDGET_V3_OVERLAY_SELECTOR,
    );
    if (overlay) controller.markOpened(overlay);
  };

  container.addEventListener("click", handleContainerClick, true);
  document.addEventListener("click", handleDocumentClick, true);
  document.addEventListener("keydown", handleDocumentKeydown, true);
  document.addEventListener("jdgm.modal.opened", handleModalOpened, true);
  observer.observe(document.body, {
    attributeFilter: ["style"],
    attributes: true,
    childList: true,
    subtree: true,
  });

  return () => {
    if (disposed) return;
    disposed = true;
    container.removeEventListener("click", handleContainerClick, true);
    document.removeEventListener("click", handleDocumentClick, true);
    document.removeEventListener("keydown", handleDocumentKeydown, true);
    document.removeEventListener("jdgm.modal.opened", handleModalOpened, true);

    const lingerMs = controller.dispose();
    if (lingerMs === 0) {
      observer.disconnect();
      return;
    }

    observerDisconnectTimer = window.setTimeout(
      () => observer.disconnect(),
      lingerMs,
    );
  };
}

function collectReviewWidgetV3Overlays(node: Node): HTMLElement[] {
  if (!(node instanceof Element)) return [];

  const overlays = node.matches(REVIEW_WIDGET_V3_OVERLAY_SELECTOR)
    ? [node as HTMLElement]
    : [];
  overlays.push(
    ...Array.from(
      node.querySelectorAll<HTMLElement>(REVIEW_WIDGET_V3_OVERLAY_SELECTOR),
    ),
  );
  return overlays;
}

function getEventElement(event: Event): Element | undefined {
  return event.target instanceof Element ? event.target : undefined;
}

function isOverlayVisible(overlay: HTMLElement): boolean {
  return (
    overlay.isConnected && !overlay.hidden && overlay.style.display !== "none"
  );
}

function releaseReviewModalKeyboardHandler(): void {
  const runtimeWindow = window as Window & {
    jdgm?: {
      $?: (value: unknown) => { off?: (events: string) => void };
    };
  };

  try {
    runtimeWindow.jdgm?.$?.(document).off?.(".writeReviewModalA11y");
  } catch {
    // The overlay itself is still removed when Judge.me's private jQuery
    // contract changes; a future modal setup also replaces this namespace.
  }
}
