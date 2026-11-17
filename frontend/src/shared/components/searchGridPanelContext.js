import { createContext } from "react";

/** True inside a SearchGridPanel: the listing surface has a bounded height, so a table in it shrinks to fit. */
export const SearchGridPanelContext = createContext(false);
