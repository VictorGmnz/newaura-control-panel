// AutoTextarea.jsx
import React, { useEffect, useRef } from "react";

export default function AutoTextarea({
  value,
  onChange,
  minRows = 2,
  maxRows = 8,
  className = "",
  ...props
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const style = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    el.style.minHeight = `${lineHeight * minRows}px`;

    el.style.height = "auto";
    const maxHeight = lineHeight * maxRows;
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, minRows, maxRows]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={minRows}
      className={`resize-none ${className}`}
      {...props}
    />
  );
}
