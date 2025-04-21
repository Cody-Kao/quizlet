import { SlMagnifier } from "react-icons/sl";
import { useState, useRef, useEffect } from "react";
import MailModal from "./MailModal";
import { MailViewType } from "../Types/types";
import UserLink from "./UserLink.tsx";
import { formatTime } from "../Utils/utils";
import { ADMIN } from "../Consts/consts.tsx";

export default function MailBox({
  fetchedData,
}: {
  fetchedData: MailViewType[];
}) {
  console.log("from MailBox:", fetchedData);
  const mailMap: Record<string, MailViewType> = {};
  // 搜尋郵件
  const [queryTitle, setQueryTitle] = useState<string>("");
  // input ref
  const inputRef = useRef<HTMLInputElement | null>(null);
  // deBouncer的timer ref
  const timerRef = useRef<number>(0);
  const deBouncer = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setQueryTitle(inputRef.current?.value ?? "");
    }, 2000);
  };
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
    };
  }, []);
  const handleSubmitQueryTitle = () => {
    clearTimeout(timerRef.current);
    setQueryTitle(inputRef.current?.value ?? "");
  };

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]; // Get YYYY-MM-DD format
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // Month is 0-indexed in JS

  const groupedData: Record<string, MailViewType[]> = {};

  fetchedData.forEach((item) => {
    if (queryTitle !== "" && !item.title.includes(queryTitle)) {
      return;
    }
    const dateObj = new Date(formatTime(item.date).replace(/\//g, "-")); // Convert "YYYY/MM/DD" to "YYYY-MM-DD"
    const dateStr = dateObj.toISOString().split("T")[0]; // Normalize to YYYY-MM-DD
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1; // Get correct month

    let key: string;
    if (dateStr === todayStr) {
      key = "今天";
    } else if (year === currentYear && month === currentMonth) {
      key = "這個月";
    } else {
      key = `${year}年${month}月`;
    }

    if (!groupedData[key]) {
      groupedData[key] = [];
    }
    groupedData[key].push(item);
    mailMap[item.id] = item; // 順便把mail id : maiViewType做好對應的dictionary
  });

  // Convert object to array format
  const data = Object.entries(groupedData);
  const [openMailID, setOpenMailID] = useState<string>("");
  const [isMailModalOpen, setIsMailModalOpen] = useState<boolean>(false);
  return (
    <>
      {/* overlay for reading mail */}
      {isMailModalOpen ? (
        <div
          onClick={() => setIsMailModalOpen(false)}
          className="fixed inset-0 z-600 bg-black opacity-[.4]"
        ></div>
      ) : (
        ""
      )}
      {/* view mail modal */}

      <MailModal
        isMailModalOpen={isMailModalOpen}
        setIsMailModalOpen={setIsMailModalOpen}
        mail={mailMap[openMailID] ?? {}}
      />

      {/* main content area */}
      <div className="flex h-full w-full flex-col bg-gray-100 px-[2rem] py-[2rem] sm:px-[4rem] md:px-[8rem]">
        <header className="mb-[3rem]">
          <h1 className="text-[2rem] font-bold">郵件</h1>
        </header>

        <div className="flex flex-col">
          <form className="mb-[32px] flex h-[50px] max-w-[450px] items-center rounded-xl bg-[#fff]">
            <input
              className="w-full max-w-full p-[.8rem] placeholder-gray-900 outline-none"
              type="text"
              placeholder="搜尋郵件標題"
              ref={inputRef}
              onChange={() => deBouncer()}
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                handleSubmitQueryTitle();
              }}
              className="pr-[1rem] hover:cursor-pointer"
              type="submit"
            >
              <SlMagnifier />
            </button>
          </form>
          {/* 組件container */}
          {data.map((DateAndData, index) => (
            <div className="mb-[4rem] flex flex-col gap-[.5rem]" key={index}>
              <div className="flex w-full items-center">
                <p className="mr-4 font-bold whitespace-nowrap">
                  {/* 組件日期 */}
                  {DateAndData[0]}
                </p>
                <div className="h-[2px] flex-grow bg-gray-300"></div>
              </div>
              {/* 組件白色container */}
              {DateAndData[1].map((data) => (
                <div
                  onClick={() => {
                    setOpenMailID(data.id), setIsMailModalOpen(true);
                  }}
                  key={data.id}
                  className="relative mb-[.8rem] flex flex-col flex-wrap gap-[.5rem] overflow-hidden rounded-xl bg-[#fff] p-[.8rem] shadow-lg after:absolute after:bottom-0 after:left-0 after:h-[5px] after:w-full after:scale-x-0 after:rounded-xl after:bg-[var(--light-theme-color)] after:opacity-[.5] after:content-[''] hover:cursor-pointer hover:after:scale-x-100 sm:gap-[1rem]"
                >
                  {data.read === false && (
                    <div className="absolute top-0 left-0 h-[12%] w-full bg-[var(--light-theme-color)] opacity-[.9]">
                      <span className="absolute top-[-50%] right-0 text-[1.5rem] font-bold text-red-400">
                        New
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="relative after:absolute after:right-[-20%] after:bottom-[50%] after:h-[18px] after:w-[2px] after:translate-y-[50%] after:bg-black after:content-['']">
                      寄件者
                    </span>
                    <UserLink userID={ADMIN.id} />
                  </div>
                  <div className="flex flex-wrap items-center">
                    <p className="text-[1.5rem] font-bold">{data.title}</p>
                    <span className="ml-auto">{formatTime(data.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
