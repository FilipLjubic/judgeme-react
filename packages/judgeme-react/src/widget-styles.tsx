import type {ComponentPropsWithoutRef} from "react";
import type {LegacyWidgetResources} from "./legacy-api.js";

export interface JudgeMeWidgetStylesProps
  extends Omit<
    ComponentPropsWithoutRef<"style">,
    "children" | "dangerouslySetInnerHTML"
  > {
  data: Pick<LegacyWidgetResources, "styles">;
}

/**
 * Mounts Judge.me's shared dashboard CSS once for a group of widgets.
 *
 * @deprecated Widget components now load their required CSS automatically.
 * This remains available as a backwards-compatible eager style hint.
 */
export function JudgeMeWidgetStyles({
  data,
  ...styleProps
}: JudgeMeWidgetStylesProps) {
  if (!data.styles) return null;

  return (
    <style
      {...styleProps}
      data-judgeme-react-styles="legacy-widgets"
      dangerouslySetInnerHTML={{__html: data.styles}}
    />
  );
}
