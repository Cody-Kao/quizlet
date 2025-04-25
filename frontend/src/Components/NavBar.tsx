import SearchBar from "./SearchBar";
import { MdOutlineSettings } from "react-icons/md";
import { HiOutlineMoon } from "react-icons/hi";
import { useEffect, useState, useRef } from "react";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { Link, useNavigate } from "react-router";
import { GoogleLogin } from "@react-oauth/google";
import { postRequest } from "../Utils/postRequest";
import { PATH } from "../Consts/consts";
import { OAuthLogInRequest } from "../Types/request";
import { FrontEndUser } from "../Types/response";
import { NoticeDisplay } from "../Types/types";
import { CgProfile } from "react-icons/cg";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";

export default function NavBar({
  setIsSideBarOpen,
}: {
  setIsSideBarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { user, setUser, setLogIn, isLogIn, isChecking, setLogOut } =
    useLogInContextProvider();
  const { setNotice } = useNoticeDisplayContextProvider();
  const [isCardOpen, setIsCardOpen] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLLabelElement | null>(null);
  const navigate = useNavigate();
  // close card function
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        cardRef.current &&
        !cardRef.current.contains(event.target as Node) &&
        profileRef.current &&
        !profileRef.current.contains(event.target as Node) // Exclude profile icon
      ) {
        setIsCardOpen(false);
      }
    }

    if (isCardOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCardOpen]);

  const handleOAuthLogIn = (credentialToken: string) => {
    postRequest(`${PATH}/OAuthLogIn`, {
      credential: credentialToken,
    } as OAuthLogInRequest)
      .then((data) => {
        setLogIn();
        setUser(data.payload as FrontEndUser);
        setNotice({
          type: "Success",
          payload: { message: "登入成功!" },
        } as NoticeDisplay);
      })
      .catch((error) => {
        console.log(error);
        setNotice(error as NoticeDisplay);
      });
  };

  const handleLogOut = () => {
    postRequest(`${PATH}/logOut`, {})
      .then((data) => {
        setIsCardOpen(false);
        setNotice(data as NoticeDisplay);
        setLogOut();
      })
      .catch((error) => {
        setNotice(error as NoticeDisplay);
      });
  };

  return (
    <>
      {/* 把這個登入oneTap放在任何會出現navBar的page，這樣可以避開放在context讓就連errorPage也出現 */}
      {/* hidden是用來把log in的btn隱藏掉的，只留下useOneTap */}
      <div className="hidden">
        {!isChecking && !isLogIn && (
          <GoogleLogin
            onSuccess={(credentialResponse) =>
              handleOAuthLogIn(
                credentialResponse.credential !== undefined
                  ? credentialResponse.credential
                  : "",
              )
            }
            useOneTap={true}
          />
        )}
      </div>
      {/* Top Nav */}
      <div className="sticky top-0 z-10 box-border flex w-full items-center gap-[1rem] bg-white px-4 py-2 text-[#586380]">
        {/* Burger and Logo container */}
        <div className="flex h-full max-h-[25px] min-w-0 flex-[1] items-center gap-1">
          <button
            className="flex flex-col space-y-1 p-2 hover:cursor-pointer"
            onClick={() => setIsSideBarOpen((prev) => !prev)}
          >
            <div className="h-1 w-6 rounded bg-black"></div>
            <div className="h-1 w-6 rounded bg-black"></div>
            <div className="h-1 w-6 rounded bg-black"></div>
          </button>
          <Link
            to="/"
            className="hideLogo sm-screen z-10 hidden hover:cursor-pointer"
          >
            <img
              className="h-[2.6rem] w-auto max-w-[2.5rem] scale-[120%] bg-contain bg-no-repeat object-center"
              src="/image/logo.png"
              alt="Logo"
            />
          </Link>
        </div>
        {/* Search bar container (larger portion) */}
        <div className="expandSearchBar flex h-full min-w-[20%] flex-[90%] items-center justify-end sm:flex-[6] sm:justify-center">
          <SearchBar />
        </div>

        {/* Profile container */}
        {isLogIn ? (
          <label
            ref={profileRef}
            htmlFor="cardCheckbox"
            className="relative mr-0 ml-auto flex h-12 min-h-12 w-12 min-w-12 items-center justify-center hover:cursor-pointer sm:mr-[1rem]"
          >
            {user?.img ? (
              <img
                className="aspect-square h-full w-full rounded-full object-cover"
                src={user.img}
                alt="Profile"
              />
            ) : (
              <CgProfile className="aspect-square h-full w-full rounded-full" />
            )}
            <input
              className="hidden"
              type="checkbox"
              id="cardCheckbox"
              onChange={() => setIsCardOpen((prev) => !prev)}
            />
          </label>
        ) : (
          <button
            onClick={() => navigate("/toLogin")}
            className="ml-auto min-w-[50px] rounded-lg bg-[var(--light-theme-color)] p-2 text-[.8rem] font-bold text-white hover:cursor-pointer hover:bg-blue-700 md:px-4 md:text-[1rem]"
          >
            登入
          </button>
        )}
        {/* 點擊profile image 出現的Card */}

        {isCardOpen && (
          <div
            ref={cardRef}
            className="absolute top-full left-full flex h-[280px] max-h-max w-[250px] translate-x-[-110%] flex-col overflow-hidden rounded-2xl bg-[#fefefe] shadow-lg"
          >
            <div className="flex w-full flex-2/5 items-center gap-3 border-b-2 border-gray-300 p-3">
              {user?.img ? (
                <img
                  className="h-[4rem] w-[4rem] rounded-[50%] object-cover" // Added object-cover
                  src={user.img}
                  alt="profile pic"
                />
              ) : (
                <CgProfile className="h-[4rem] w-[4rem] rounded-[50%] object-cover" />
              )}
              <div className="flex w-[70%] flex-col break-words">
                <span className="text-[1rem] font-bold">
                  {user !== null ? user.name : ""}
                </span>
                <span className="text-[.8rem]">
                  {user !== null ? user.email : ""}
                </span>
              </div>
            </div>
            <div className="flex w-full flex-2/5 flex-col border-b-2 border-gray-300 font-bold">
              <div
                onClick={() => {
                  navigate("/setting", { replace: false });
                  setIsCardOpen(false);
                }}
                className="w-full flex-grow px-5 py-2 hover:cursor-pointer hover:bg-gray-300"
              >
                <div className="flex h-full w-full items-center gap-4 text-xl">
                  <span className="flex w-6 items-center justify-center">
                    <MdOutlineSettings className="text-2xl" />
                  </span>
                  <span>設定</span>
                </div>
              </div>
              {/* 深色模式待開發 */}
              <div className="flex w-full flex-grow px-5 py-2 opacity-50 grayscale hover:cursor-not-allowed hover:bg-gray-300">
                <div className="flex h-full w-full items-center gap-4 text-xl">
                  <span className="flex w-6 items-center justify-center">
                    <HiOutlineMoon className="text-2xl" />
                  </span>
                  <span>深色模式(待開發)</span>
                </div>
              </div>
            </div>
            <div
              onClick={() => {
                handleLogOut();
                setIsCardOpen(false);
              }}
              className="w-full flex-1/5 border-b-2 border-gray-300 font-bold"
            >
              <div className="flex h-full w-full items-center px-5 py-2 hover:cursor-pointer hover:bg-gray-300">
                <button className="text-xl">登出</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
