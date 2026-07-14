import {
  useEffect,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
} from "react";
import type { UgcMediaGridData } from "./legacy-api.js";
import {
  disposeUgcMediaGrid,
  initializeUgcMediaGrid,
} from "./legacy-runtime.js";
import { useJudgeMe } from "./provider.js";

const PENDING_UGC_CLASSES: Readonly<Record<string, string>> = {
  "jdgm-ugc-media": "jdgm-react-ugc-media-pending",
  "jdgm-ugc-media-wrapper": "jdgm-react-ugc-media-wrapper-pending",
};

export interface UgcMediaGridProps extends Omit<
  ComponentPropsWithoutRef<"div">,
  "children" | "dangerouslySetInnerHTML"
> {
  data: UgcMediaGridData;
  /** Skip shared dashboard CSS when another widget already renders it. */
  includeStyles?: boolean;
}

/**
 * Server-renders Judge.me's UGC data shell, then mounts the official grid,
 * lazy-media, pagination and lightbox behavior for one React-owned root.
 */
export function UgcMediaGrid({
  data,
  includeStyles = true,
  ...containerProps
}: UgcMediaGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { meta } = useJudgeMe();
  const mountHtml = useMemo(() => maskUgcRuntimeClasses(data.html), [data.html]);

  useEffect(() => {
    const container = containerRef.current;
    const publicToken = meta.config.publicToken;
    let active = true;

    if (!container || !publicToken) {
      if (container) container.dataset.judgemeReactRuntimeStatus = "error";
      return;
    }

    container.dataset.judgemeReactRuntimeStatus = "loading";
    initializeUgcMediaGrid({
      container,
      isCurrent: () => active,
      publicToken,
      settings: data.settings,
      shopDomain: meta.config.shopDomain,
    })
      .then(() => {
        if (active) container.dataset.judgemeReactRuntimeStatus = "ready";
      })
      .catch((error: unknown) => {
        if (!active) return;

        disposeUgcMediaGrid(container);
        container.dataset.judgemeReactRuntimeStatus = "error";
        console.error("Judge.me UGC Media Grid runtime error", error);
      });

    return () => {
      active = false;
      disposeUgcMediaGrid(container);
    };
  }, [data.settings, meta.config.publicToken, meta.config.shopDomain]);

  return (
    <div
      {...containerProps}
      ref={containerRef}
      data-judgeme-react-post-count={data.postCount}
      data-judgeme-react-runtime-status="loading"
      data-judgeme-react-source={data.source}
      data-judgeme-react-widget="ugc-media-grid"
    >
      <div dangerouslySetInnerHTML={{ __html: mountHtml }} />
      {includeStyles ? (
        <style
          data-judgeme-react-styles="ugc-media-grid"
          dangerouslySetInnerHTML={{ __html: data.styles }}
        />
      ) : null}
    </div>
  );
}

function maskUgcRuntimeClasses(html: string): string {
  return html.replace(
    /class\s*=\s*(["'])([\s\S]*?)\1/gi,
    (_attribute, quote: string, classNames: string) => {
      const maskedClassNames = classNames
        .split(/(\s+)/)
        .map((token) => PENDING_UGC_CLASSES[token] ?? token)
        .join("");
      return `class=${quote}${maskedClassNames}${quote}`;
    },
  );
}
