import { useSelector } from "react-redux";
import useStoreDisplayName from "@/shared/hooks/useStoreDisplayName";

const readUser = () => {
  try {
    return useSelector((state) => state?.auth?.user ?? null); // eslint-disable-line react-hooks/rules-of-hooks -- throws the same way on every render when there is no store
  } catch {
    return null;
  }
};

/** The signed-in store's name for export file names and footers; "" when nobody is signed in or there is no store state (isolated component tests). */
export default function useExportStoreName() {
  return useStoreDisplayName(readUser());
}
