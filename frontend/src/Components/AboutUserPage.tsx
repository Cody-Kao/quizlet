import { Link } from "react-router";
import { SlMagnifier } from "react-icons/sl";
import { useEffect, useRef, useState } from "react";
import UserLink from "./UserLink";
import { LibPage } from "../Types/response";
import { CgProfile } from "react-icons/cg";

export default function AboutUserPage({
  fetchedData,
}: {
  fetchedData: LibPage;
}) {
  console.log("AboutUserPage");
  const sectionTitles = ["全部學習卡", "已儲存", "創作"];
  const titleMapWordSetsCnt: Record<string, number> = {
    [sectionTitles[0]]:
      fetchedData.likedWordSets.length + fetchedData.createdWordSets.length,
    [sectionTitles[1]]: fetchedData.likedWordSets.length,
    [sectionTitles[2]]: fetchedData.createdWordSets.length,
  };

  const [section, setSection] = useState<string>(sectionTitles[0]);

  // for search word card inside Lib
  const [queryTitle, setQueryTitle] = useState<string>("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const timerIDRef = useRef<number>(0);

  const handleSearch = (title: string) => {
    deBouncer(title);
  };

  const deBouncer = (title: string) => {
    clearTimeout(timerIDRef.current);
    timerIDRef.current = setTimeout(() => {
      setQueryTitle(title);
    }, 2000);
  };

  const enterQueryTitle = () => {
    clearTimeout(timerIDRef.current);
    setQueryTitle(searchRef.current?.value ?? "");
  };

  // 確保un-mount也清除timeout、eventListener
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Check if the key pressed is Enter and if the searchRef input is focused
      if (
        event.key === "Enter" &&
        document.activeElement === searchRef.current
      ) {
        // Call your function here
        enterQueryTitle(); // Replace with your function name
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      clearTimeout(timerIDRef.current);
    };
  }, []);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]; // Get YYYY-MM-DD format
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // Month is 0-indexed in JS

  const allWordSets = fetchedData.likedWordSets
    .concat(fetchedData.createdWordSets)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const groupedData: Record<string, typeof allWordSets> = {};

  allWordSets
    .filter(
      (data) =>
        section === "全部學習卡" ||
        (section === "已儲存" && data.authorID !== fetchedData.user.id) ||
        (section === "創作" && data.authorID === fetchedData.user.id),
    )
    .forEach((item) => {
      if (queryTitle === "") {
        const dateObj = new Date(item.createdAt.replace(/\//g, "-")); // Convert "YYYY/MM/DD" to "YYYY-MM-DD"
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
      } else if (item.title.includes(queryTitle)) {
        const dateObj = new Date(item.createdAt.replace(/\//g, "-")); // Convert "YYYY/MM/DD" to "YYYY-MM-DD"
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
      }
    });

  // Convert object to array format
  const data = Object.entries(groupedData);

  return (
    <>
      {/* 本人就連到Lib 非本人才連到這 */}
      <div className="flex h-full w-full flex-col bg-gray-100 px-[2rem] py-[2rem] sm:px-[4rem] md:px-[8rem]">
        <header className="mb-[2rem] flex items-end gap-3">
          {fetchedData.user.img !== "" ? (
            <img
              className="h-[3rem] w-[3rem] rounded-full sm:h-[4rem] sm:w-[4rem]"
              src={fetchedData.user.img}
              alt=""
            />
          ) : (
            <CgProfile className="h-[3rem] w-[3rem] rounded-full sm:h-[4rem] sm:w-[4rem]" />
          )}
          <div className="flex flex-col">
            {/* userName */}
            <span className="text-[1rem] font-bold sm:text-[1.5rem]">
              {fetchedData.user.name}
            </span>
            {/* 加入日期 */}
            <span className="text-[.8rem] sm:text-[1rem]">{`於${fetchedData.user.createdAt}加入`}</span>
          </div>
          <div className="ml-[1rem] flex h-full items-end gap-2 text-[.8rem] sm:ml-[5rem] sm:gap-[1rem] sm:text-[1rem]">
            <div>
              被收藏數:&nbsp;
              <span className="text-black">{fetchedData.user.likeCnt}</span>
            </div>
            <div>
              被衍生數:&nbsp;
              <span className="text-black">{fetchedData.user.forkCnt}</span>
            </div>
          </div>
        </header>
        <div className="mb-[1rem] text-[var(--light-theme-color)]">
          {fetchedData.user.role === "admin" ? " #此為唯一認證官方帳號" : ""}
        </div>

        <div className="mb-[3rem] flex gap-[2rem] border-b-2 border-gray-200 pb-[10px] text-[1rem] font-bold">
          {sectionTitles.map((title) => (
            <span
              onClick={() => setSection(title)}
              key={title}
              className={`relative after:absolute after:bottom-[-11px] after:left-0 after:h-[2px] after:w-full after:bg-[var(--light-theme-color)] after:opacity-0 after:transition-opacity after:duration-300 hover:cursor-pointer ${
                section === title
                  ? "text-[var(--light-theme-color)] after:opacity-100"
                  : ""
              }`}
            >
              {`${title}(${titleMapWordSetsCnt[title]})`}
            </span>
          ))}
        </div>
        <div className="flex flex-col">
          <form className="mb-[32px] flex h-[50px] max-w-[450px] items-center rounded-xl bg-[#fff]">
            <input
              ref={searchRef}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full max-w-full p-[.8rem] placeholder-gray-900 outline-none"
              type="text"
              placeholder="搜尋單詞卡"
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                enterQueryTitle();
              }}
              className="pr-[1rem] hover:cursor-pointer"
              type="submit"
            >
              <SlMagnifier />
            </button>
          </form>
          {/* 組件container */}
          {data.map((DateAndData) => (
            <div
              className="mb-[4rem] flex flex-col gap-[.5rem]"
              key={DateAndData[0]}
            >
              <div className="flex w-full items-center">
                <p className="mr-4 font-bold whitespace-nowrap">
                  {/* 組件日期 */}
                  {DateAndData[0]}
                </p>
                <div className="h-[2px] flex-grow bg-gray-300"></div>
              </div>
              {/* 組件白色container */}
              {DateAndData[1].map((data) => (
                <Link
                  to={`/wordSet/${data.id}`}
                  className="relative mb-[.8rem] flex flex-col flex-wrap gap-[.5rem] overflow-hidden rounded-xl bg-[#fff] p-[.8rem] shadow-lg after:absolute after:bottom-0 after:left-0 after:h-[5px] after:w-full after:scale-x-0 after:rounded-xl after:bg-[var(--light-theme-color)] after:opacity-[.5] after:content-[''] hover:after:scale-x-100 sm:gap-[1rem]"
                  key={data.id}
                >
                  <div className="flex items-center gap-3">
                    <span className="relative after:absolute after:right-[-10%] after:bottom-[50%] after:h-[18px] after:w-[2px] after:translate-y-[50%] after:bg-black after:content-['']">
                      {data.wordCnt}個詞語
                    </span>
                    <UserLink userID={data.authorID} />
                  </div>
                  <div className="flex items-center">
                    <p className="text-[1.5rem] font-bold">{data.title}</p>
                    <span className="ml-auto">{data.createdAt}</span>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
