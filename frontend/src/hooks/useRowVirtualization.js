import { useVirtualizer } from "@tanstack/react-virtual";

export default function useRowVirtualization(options) {
  "use no memo";
  // TanStack Virtual exposes a mutable instance. Keep that instance inside this
  // compatibility boundary until it supports React Compiler; callers receive
  // render snapshots instead of memoizing reads from the mutable instance.
  // eslint-disable-next-line react-hooks/incompatible-library -- Explicitly uncompiled boundary above; only snapshots cross into compiled callers.
  const virtualizer = useVirtualizer(options);
  return {
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    scrollToOffset: virtualizer.scrollToOffset,
    scrollToIndex: virtualizer.scrollToIndex,
  };
}
