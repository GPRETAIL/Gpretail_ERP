import { useCallback, useState } from "react";

export default function useCounterAssignmentPrompt(user) {
  const userId = user?.id ?? null;
  const needsCounter = Boolean(user && !user.counter_id);
  const [choice, setChoice] = useState(null);
  const open = choice?.userId === userId ? choice.open : needsCounter;
  const setOpen = useCallback(value => {
    setChoice(previous => ({ userId, open: typeof value === "function" ? value(previous?.userId === userId ? previous.open : needsCounter) : value }));
  }, [userId, needsCounter]);
  return [open, setOpen];
}
