import { HiOutlineHome } from "react-icons/hi";
import { FaRegFolderOpen } from "react-icons/fa";
import { LuBookA } from "react-icons/lu";
import { LuMail } from "react-icons/lu";
import { NavLink, useNavigate } from "react-router";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { useEffect } from "react";
import { getRequest } from "../Utils/getRequest";
import { PATH } from "../Consts/consts";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";
import { NoticeDisplay } from "../Types/types";
import { z } from "zod";

export default function SideBar({
  isSideBarOpen,
  setIsSideBarOpen,
  isSideBarHidden,
}: {
  isSideBarOpen: boolean;
  setIsSideBarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSideBarHidden: boolean;
}) {
  const navigate = useNavigate();
  const { isLogIn, isChecking, user, unreadMails, setUnreadMails } =
    useLogInContextProvider();
  const { setNotice } = useNoticeDisplayContextProvider();

  useEffect(() => {
    if (isChecking || !isLogIn || user === null) return;
    getRequest(`${PATH}/getUnreadMailsCnt/${user?.id}`, z.number())
      .then((data) => {
        setUnreadMails(data as number);
      })
      .catch((error) => {
        setNotice(error as NoticeDisplay);
      });
  }, [isLogIn, isChecking, user]);

  return (
    <>
      {/* Burger and Logo container (smaller portion) */}
      {isSideBarHidden && isSideBarOpen && (
        <div className="mb-[15%] flex h-full max-h-[25px] min-w-0 flex-[1] items-center gap-1 pt-2">
          {/* Burger button */}
          <button
            className="flex flex-col space-y-1 p-2 hover:cursor-pointer"
            onClick={() => setIsSideBarOpen(!isSideBarOpen)}
          >
            <div className="h-1 w-6 rounded bg-black"></div>
            <div className="h-1 w-6 rounded bg-black"></div>
            <div className="h-1 w-6 rounded bg-black"></div>
          </button>
          {/* Logo */}
          <button
            onClick={() => {
              navigate("/", { replace: false });
              setIsSideBarOpen(!isSideBarOpen);
            }}
            className="sm-screen hidden hover:cursor-pointer"
          >
            <img
              className="h-[2.6rem] w-auto max-w-[2.5rem] scale-[120%] bg-contain bg-no-repeat object-center"
              src="/image/logo.png"
            />
          </button>
        </div>
      )}
      {[
        {
          to: "/",
          icon: <HiOutlineHome />,
          label: "首頁",
        },
        {
          to: `/myLib`,
          icon: <FaRegFolderOpen />,
          label: "你的書庫",
        },
        {
          to: "/createWordSet",
          icon: <LuBookA />,
          label: "創建字卡",
        },
        {
          to: "/mailBox",
          icon: <LuMail />,
          label: "郵件",
        },
      ].map(({ to, icon, label }) => (
        <NavLink
          key={to}
          onClick={() => {
            setIsSideBarOpen(false);
          }}
          to={to}
          className={({ isActive }) =>
            `light-hover relative flex h-12 items-center rounded-xl p-2 py-4 font-bold text-[#586380] ${
              isActive ? "light-nav-color light-nav-bg-color font-bold" : ""
            } ${isSideBarOpen ? "" : "hover-tag w-[48px]"}`
          }
          data-label={label} /* Pass the label dynamically to hover-tag */
        >
          {/* Icon Container */}
          <div className="relative flex w-8 flex-shrink-0 items-center justify-center text-[1.4rem]">
            {icon}
            {label === "郵件" && unreadMails > 0 ? (
              <span className="absolute top-[40%] right-[-20%] flex h-[1.2rem] w-[1.2rem] items-center justify-center rounded-full bg-[var(--light-theme-color)] p-2 text-[.8rem] text-white">
                {unreadMails > 9 ? "9+" : unreadMails}
              </span>
            ) : (
              ""
            )}
          </div>

          {/* Text (Hidden When Collapsed) */}
          <span
            className={`text-md ml-2 transition-transform duration-300 ${
              isSideBarOpen ? "visible scale-100" : "invisible scale-0"
            }`}
          >
            {label}
          </span>
        </NavLink>
      ))}
    </>
  );
}
