import { useSelector } from "react-redux";
import useStoreDisplayName from "@/shared/hooks/useStoreDisplayName";

const readUser = () => {
  try {
    return useSelector((state) => state?.auth?.user ?? null); // eslint-disable-line react-hooks/rules-of-hooks -- throws the same way on every render when there is no store
  } catch {
    return null;
  }
};

/** Who and where an export is for: the signed-in store's name and the user's name. Both "" when there is no store state (isolated component tests). */
export default function useExportContext() {
  const user = readUser();
  const storeName = useStoreDisplayName(user);
  return { storeName, userName: String(user?.name || user?.username || "").trim() };
}
