import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

const PANEL_SCROLLBAR_OPTIONS = {
  overflow: {
    x: "hidden",
    y: "scroll",
  },
  scrollbars: {
    theme: "os-theme-eco-panel",
    visibility: "auto",
    autoHide: "never",
    dragScroll: true,
    clickScroll: true,
    pointers: ["mouse", "pen", "touch"],
  },
};

export default function ScrollablePanel({ children, ...props }) {
  return (
    <OverlayScrollbarsComponent
      element="aside"
      options={PANEL_SCROLLBAR_OPTIONS}
      defer
      {...props}
    >
      {children}
    </OverlayScrollbarsComponent>
  );
}
