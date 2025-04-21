import { createContext, ReactElement, useContext, useState } from "react";
import { NoticeDisplay } from "../Types/types";

interface NoticeDisplayContextProviderType {
  notice: NoticeDisplay | null;
  setNotice: React.Dispatch<React.SetStateAction<NoticeDisplay | null>>;
}

const NoticeDisplayContext = createContext<
  NoticeDisplayContextProviderType | undefined
>(undefined);

export const useNoticeDisplayContextProvider = () => {
  console.log("useNoticeDisplayContextProvider!!");
  const context = useContext(NoticeDisplayContext);
  if (context === undefined) {
    throw new Error("context is undefined!");
  }
  return context;
};

export default function NoticeDisplayContextProvider({
  children,
}: {
  children: ReactElement | ReactElement[];
}) {
  const [notice, setNotice] = useState<NoticeDisplay | null>(null);

  return (
    <NoticeDisplayContext.Provider
      value={{ notice: notice, setNotice: setNotice }}
    >
      {children}
    </NoticeDisplayContext.Provider>
  );
}
