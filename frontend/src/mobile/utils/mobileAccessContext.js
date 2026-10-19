import { createContext, useContext } from "react";

export const MobileAccessContext = createContext(null);
export const useMobileAccess = () => useContext(MobileAccessContext);

export const canOpenMobileScreen = (screens, page) => !Array.isArray(screens) || screens.includes(page);
