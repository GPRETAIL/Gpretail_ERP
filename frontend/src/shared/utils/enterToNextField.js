const FOCUSABLE_SELECTOR = [
  "input:not([type='hidden']):not([disabled]):not([readonly]):not([tabindex='-1'])",
  "select:not([disabled]):not([tabindex='-1'])",
  "textarea:not([disabled]):not([readonly]):not([tabindex='-1'])",
  "button:not([disabled]):not([tabindex='-1'])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

const isVisible = (el) =>
  Boolean(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));

const selectSearchState = new WeakMap();

export const openNativeSelect = (selectEl) => {
  const open = () => {
    if (!selectEl || selectEl.disabled) return;
    try {
      if (typeof selectEl.showPicker === "function") {
        selectEl.showPicker();
        return;
      }
    } catch {
      // Some browsers throw if picker can't be shown; fallback below.
    }

    selectEl.click();
    selectEl.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        code: "ArrowDown",
        keyCode: 40,
        which: 40,
        bubbles: true,
      })
    );
  };

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(open);
  } else {
    setTimeout(open, 0);
  }
};

const DATE_LIKE_INPUT_TYPES = new Set(["date", "datetime-local", "month", "time", "week"]);

const openNativeInputPicker = (inputEl) => {
  if (!inputEl || inputEl.disabled) return;
  if (!DATE_LIKE_INPUT_TYPES.has(inputEl.type)) return;

  const open = () => {
    try {
      if (typeof inputEl.showPicker === "function") {
        inputEl.showPicker();
      } else {
        inputEl.click();
      }
    } catch {
      // Some browsers block programmatic picker open outside trusted gestures.
    }
  };

  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(open);
  } else {
    setTimeout(open, 0);
  }
};

const handleSelectTypeahead = (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  if (target.disabled || target.multiple) return;
  if (event.defaultPrevented || event.isComposing) return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;

  const key = event.key;
  const isChar = key.length === 1;
  const isSpace = key === " ";
  if (!isChar && !isSpace) return;

  const now = Date.now();
  const prev = selectSearchState.get(target) || { query: "", ts: 0 };
  const query = now - prev.ts > 700 ? key.toLowerCase() : `${prev.query}${key.toLowerCase()}`;
  selectSearchState.set(target, { query, ts: now });

  const options = Array.from(target.options || []);
  if (!options.length) return;

  const match = options.find(
    (opt) =>
      !opt.disabled &&
      String(opt.textContent || "")
        .trim()
        .toLowerCase()
        .includes(query)
  );

  if (!match) return;
  if (String(target.value) === String(match.value)) return;

  target.value = String(match.value);
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
  event.preventDefault();
};

export const handleEnterKeyNavigation = (event) => {
  handleSelectTypeahead(event);

  if (event.key !== "Enter" || event.defaultPrevented || event.isComposing) return;
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;

  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.closest("[data-enter-ignore='true']")) return;
  if (target.tagName === "TEXTAREA") return;
  if (target.getAttribute("role") === "combobox" || target.getAttribute("aria-autocomplete")) return;

  const scope =
    target.closest("[data-enter-scope='true']") ||
    target.closest("form");
  if (!scope) return;

  const focusables = Array.from(scope.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => el instanceof HTMLElement && isVisible(el)
  );
  if (!focusables.length) return;

  const index = focusables.indexOf(target);
  if (index < 0 || index === focusables.length - 1) return;

  event.preventDefault();
  const next = focusables[index + 1];
  next.focus();

  if (next instanceof HTMLSelectElement) {
    openNativeSelect(next);
    return;
  }
  if (next instanceof HTMLInputElement && DATE_LIKE_INPUT_TYPES.has(next.type)) {
    openNativeInputPicker(next);
    return;
  }
  if (next instanceof HTMLElement && next.dataset.searchableSelectTrigger === "true") {
    next.click();
    return;
  }

  if (
    next instanceof HTMLInputElement &&
    !["checkbox", "radio", "button", "submit"].includes(next.type)
  ) {
    next.select();
  }
};
