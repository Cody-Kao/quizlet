import { IoSettingsOutline } from "react-icons/io5";
import { FaStar } from "react-icons/fa";
import { LiaRandomSolid } from "react-icons/lia";
import { IoClose } from "react-icons/io5";
import { Outlet, Link, useLocation, NavLink, useNavigate } from "react-router";
import { FullWordCardType } from "../Types/response";
import { useEffect, useRef, useState } from "react";

export default function Game({ wordSet }: { wordSet: FullWordCardType }) {
  /* const [curNumber, setCurNumber] = useState<number>(1); // 目前到第幾題(用於進度條)
  const addCurNumber = () => {
    setCurNumber((prev) => prev + 1);
  };
  const minusCurNumber = () => {
    setCurNumber((prev) => prev - 1);
  }; */

  const [isRandom, setIsRandom] = useState<boolean>(false);
  const [onlyStar, setOnlyStar] = useState<boolean>(false);

  const [isSettingOpen, setIsSettingOpen] = useState<boolean>(false);
  const settingModalRef = useRef<HTMLDivElement | null>(null);

  const options: string[] = ["單字卡", "選擇題", "填充題"];
  const paths: string[] = ["wordCard", "multiChoice", "cloze"];

  const location = useLocation();
  /* const shouldProgressBarDisplay =
    location.pathname.split("/").filter(Boolean).pop() === "wordCard"; */ // 若path結尾為wordCard，則是fullWordCard，不顯示進度條

  const [isCardAutoPlaying, setIsCardAutoPlaying] = useState<boolean>(false);

  const navigate = useNavigate();
  // 若path結尾為空(只有wordSetID) 則跳到預設的wordCard

  // 滾動頁面/點擊其他處 關閉setting modal
  useEffect(() => {
    const handleClickPage = (e: MouseEvent) => {
      if (
        settingModalRef.current &&
        !settingModalRef.current.contains(e.target as Node)
      ) {
        setIsSettingOpen(false);
      }
    };
    const handleScrollPage = () => {
      setIsSettingOpen(false);
    };
    window.addEventListener("mousedown", handleClickPage);
    // 因為我有overflow-hidden在Home component的content div，所以window無法知道是否scroll
    // 因此要bind scroll在content div上
    const contentDiv = document.getElementById("content");
    if (contentDiv === null) {
      return;
    }
    contentDiv.addEventListener("scroll", handleScrollPage);

    return () => {
      window.removeEventListener("mousedown", handleClickPage);
      contentDiv.removeEventListener("scroll", handleScrollPage);
    };
  }, []);

  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(false);
    const timer = setTimeout(() => setIsActive(true), 300); // Small delay to trigger transition
    return () => clearTimeout(timer);
  }, [location.key]); // Trigger on route change

  useEffect(() => {
    const lastSegment = location.pathname.split("/").filter(Boolean).pop(); // Removes empty segments
    if (lastSegment === wordSet.id) {
      navigate(`wordCard`);
    }
  }, [location.pathname, wordSet.id, navigate]); // Added dependencies

  return (
    <div className="relative flex h-full w-full flex-col items-center gap-[1rem] bg-gray-100">
      <header className="relative flex min-h-[70px] w-full items-center justify-center p-4">
        <div className="hidden max-w-[60%] flex-grow text-center text-[1.2rem] font-bold text-black md:block">
          {wordSet.title}
        </div>
        <div
          className={`${isCardAutoPlaying ? "pointer-events-none" : ""} absolute right-[5%] flex h-full items-center gap-[1rem]`}
        >
          <div ref={settingModalRef} className="relative">
            <div
              onClick={() => {
                setIsSettingOpen((prev) => !prev);
              }}
              className="flex h-[2.5rem] w-[2.5rem] items-center justify-center rounded-lg border-2 border-gray-300 p-1 text-black transition-all duration-200 after:invisible after:absolute after:top-[110%] after:left-1/2 after:z-60 after:block after:w-max after:min-w-[50px] after:-translate-x-1/2 after:bg-black after:p-1 after:text-center after:text-white after:content-['設定'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible"
            >
              <IoSettingsOutline className="h-full w-full" />
            </div>
            {/* setting modal */}
            {isSettingOpen && (
              <div className="absolute top-[110%] right-[-20%] z-50 w-[200px] rounded-lg bg-[#eee] p-[.8rem]">
                <div className="ite.ms-center flex h-[40px] w-full justify-center gap-[.5rem]">
                  <div
                    onClick={() => {
                      setIsRandom((prev) => !prev);
                      setIsSettingOpen(false);
                    }}
                    className={`relative flex h-max flex-1/2 flex-col items-center justify-center rounded-lg border-2 border-gray-300 transition-all duration-200 after:invisible after:absolute after:top-[110%] after:left-1/2 after:z-60 after:block after:w-max after:min-w-[50px] after:-translate-x-1/2 after:bg-black after:p-1 after:text-center after:text-[.8rem] after:text-white md:h-full md:flex-row ${isRandom ? "text-amber-500 after:content-['關閉隨機']" : "after:content-['開啟隨機']"} hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
                  >
                    <LiaRandomSolid className="h-7 w-7" />
                    <span className="text-[.8rem] md:hidden">
                      {isRandom ? "關閉隨機" : "開啟隨機"}
                    </span>
                  </div>
                  <div
                    onClick={() => {
                      setOnlyStar((prev) => !prev);
                      setIsSettingOpen(false);
                    }}
                    className={`${wordSet.words.filter((word) => word.star).length > 0 ? "" : "pointer-events-none text-gray-300"} ${isCardAutoPlaying ? "pointer-events-none text-gray-200" : ""} ${onlyStar ? "text-amber-500 after:content-['顯示所有單字']" : "after:content-['只顯示星號單字']"} relative flex h-max flex-1/2 flex-col items-center justify-center rounded-lg border-2 border-gray-300 transition-all duration-200 after:invisible after:absolute after:top-[110%] after:left-1/2 after:z-60 after:block after:w-max after:min-w-[50px] after:-translate-x-1/2 after:bg-black after:p-1 after:text-center after:text-[.8rem] after:text-white hover:cursor-pointer hover:bg-gray-300 hover:after:visible md:h-full md:flex-row`}
                  >
                    <FaStar className="h-7 w-7" />
                    <span className="text-[.8rem] md:hidden">
                      {onlyStar ? "顯示所有" : "只顯示星號"}
                    </span>
                  </div>
                </div>
                <div className="mt-[1.5rem] flex w-full flex-col items-center justify-center gap-[.5rem] text-[1.2rem] text-black">
                  {Array.from({ length: 3 }, (_, index) => {
                    return (
                      <NavLink
                        key={index}
                        to={paths[index]}
                        onClick={() => setIsSettingOpen(false)}
                        className={({ isActive }) =>
                          `block w-full rounded-lg p-2 hover:cursor-pointer hover:bg-gray-300 ${
                            isActive
                              ? "pointer-events-none bg-[var(--light-theme-opacity-color)] text-white"
                              : ""
                          }`
                        }
                      >
                        {options[index]}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <Link
            className="relative flex h-[2.5rem] w-[2.5rem] items-center justify-center rounded-lg border-2 border-gray-300 p-1 text-black transition-all duration-200 after:invisible after:absolute after:top-[110%] after:left-1/2 after:z-60 after:block after:w-max after:min-w-[50px] after:-translate-x-1/2 after:bg-black after:p-1 after:text-center after:text-white after:content-['返回單字集'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible"
            to={`/wordSet/${wordSet.id}`}
          >
            <IoClose className="h-full w-full" />
          </Link>
        </div>
      </header>
      {/* 進度條 => 我先把它隱藏，還不確定需不需要進度條*/}
      {/* {false && (
        <div className="flex h-[32px] w-full items-center justify-center gap-[1rem] px-[.5rem]">
          <div className="flex h-full max-w-[4rem] min-w-[3rem] items-center justify-center rounded-full bg-green-200 px-4 font-bold text-black">
            1
          </div>
          <div className="h-[50%] w-[80%] rounded-full bg-gray-300 sm:w-[70%]">
            <div
              style={{
                width: `${Math.ceil((curNumber / wordSet.words.length) * 100)}%`,
              }}
              className="h-full rounded-full bg-green-200"
            ></div>
          </div>
          <div className="flex h-full w-max max-w-[4rem] min-w-[3rem] items-center justify-center rounded-full bg-white px-4 font-bold text-black">
            {wordSet.words.length}
          </div>
        </div>
      )} */}
      <div className="relative flex w-[90%] items-center justify-center xl:w-[70%]">
        <div
          className={`${isActive ? "translate-y-0 opacity-100" : "translate-y-[200px] opacity-0"} w-full transition-all duration-200`}
        >
          <Outlet
            context={{
              wordSet,
              /* addCurNumber,
              minusCurNumber, */
              isRandom,
              onlyStar,
              setIsCardAutoPlaying,
            }}
          />
        </div>
      </div>
      {/* 手機版面標題在最下面 */}
      <div className="max-w-[60%] flex-grow text-center text-[1.2rem] font-bold text-black md:hidden">
        {wordSet.title}
      </div>
    </div>
  );
}
