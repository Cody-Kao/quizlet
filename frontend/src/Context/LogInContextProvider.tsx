import {
  createContext,
  ReactElement,
  useContext,
  useEffect,
  useState,
} from "react";
import { NoticeDisplay } from "../Types/types";
import { FrontEndUser } from "../Types/response";
import { getRequest } from "../Utils/getRequest";
import { PATH } from "../Consts/consts";
import { z } from "zod";

interface LogInContextProviderType {
  user: FrontEndUser | null;
  setUser: React.Dispatch<React.SetStateAction<FrontEndUser | null>>;
  isLogIn: boolean;
  setLogIn: () => void;
  setLogOut: () => void;
  unreadMails: number;
  setUnreadMails: React.Dispatch<React.SetStateAction<number>>;
  isChecking: boolean;
}

const logInContext = createContext<LogInContextProviderType | undefined>(
  undefined,
);

export const useLogInContextProvider = () => {
  const context = useContext(logInContext);
  if (context === undefined) {
    throw new Error("context is undefined!");
  }
  return context;
};

export default function LogInContextProvider({
  setNotice,
  children,
}: {
  setNotice: React.Dispatch<React.SetStateAction<NoticeDisplay | null>>;
  children: ReactElement | ReactElement[];
}) {
  // 取得目前url
  const currentPath = window.location.pathname; // 只會取得http://localhost:5173之後的
  // 先設user為default user
  const [user, setUser] = useState<FrontEndUser | null>(null);
  const [isLogIn, setIsLogin] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState(true); // New state to track async check
  const [unreadMails, setUnreadMails] = useState(0);
  const [firstMount, setFirstMount] = useState(true); // 管理是否為first mount

  const setLogIn = () => {
    setIsLogin(true);
  };
  const setLogOut = () => {
    setIsLogin(false);
    setUser(null);
  };

  // 確認是否登入
  useEffect(() => {
    if (currentPath.startsWith("/activateEmail")) {
      setIsChecking(false);
      return;
    }
    setFirstMount(false);
    getRequest<FrontEndUser>(
      `${PATH}/checkLogIn`,
      z.object({
        id: z.string(),
        role: z.union([z.literal("admin"), z.literal("user")]),
        name: z.string(),
        email: z.string(),
        img: z.string(),
        likedWordSets: z.array(z.string()),
      }),
    )
      .then((data) => {
        setLogIn();
        setUser(data);
      })
      .catch((error) => {
        setLogOut();
        if (!firstMount) return;
        setNotice(error as NoticeDisplay);
      })
      .finally(() => {
        setIsChecking(false);
      });
  }, [user, currentPath]);
  return (
    <>
      <logInContext.Provider
        value={{
          user: user,
          setUser: setUser,
          isLogIn: isLogIn,
          setLogIn: setLogIn,
          setLogOut: setLogOut,
          unreadMails: unreadMails,
          setUnreadMails: setUnreadMails,
          isChecking: isChecking,
        }}
      >
        {children}
      </logInContext.Provider>
    </>
  );
}
