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
 * Use this when each widget in a batched response has `includeStyles={false}`.
 * The stylesheet also contains Judge.me's star icon font, which current exact
 * widgets can reference even though they load their own extension CSS.
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
