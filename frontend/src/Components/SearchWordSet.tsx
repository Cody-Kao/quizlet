import { useEffect, useState } from "react";
import { FaStar } from "react-icons/fa";
import UserLink from "./UserLink";
import { WordSetCard, SearchWordSetCardResponse } from "../Types/response";
import ClipLoader from "react-spinners/ClipLoader";
import { getRequest } from "../Utils/getRequest";
import { PATH } from "../Consts/consts";
import { useNavigate } from "react-router";
import PreviewModal from "./PreviewModal";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";
import { NoticeDisplay } from "../Types/types";
import { z } from "zod";
import { WordSetCard as WordSetCard_Zod } from "../Types/zod_response";

export default function SearchWordSet({
  data,
  query,
}: {
  data: SearchWordSetCardResponse;
  query: string;
}) {
  const { setNotice } = useNoticeDisplayContextProvider();
  const navigate = useNavigate();
  const [wordSetCards, setWordSetCards] = useState<WordSetCard[]>(
    data.wordSetCards,
  );
  const [haveMore, setHaveMore] = useState<boolean>(data.haveMore);
  const [curNumber, setCurNumber] = useState<number>(data.wordSetCards.length); // 目前有的總搜尋數量
  const [isLoading, setIsLoading] = useState<boolean>(false); // 抓新的wordSet Card時

  // 展示預覽的單字(global state)只用一個state去決定目前預覽的是哪些單字
  const [curWordSetID, setCurWordSetID] = useState<string>(""); // 儲存目前預覽的wordSetID
  const curWordSet = wordSetCards.find(
    (wordSetCard) => wordSetCard.id === curWordSetID,
  );
  const closeModal = () => {
    setCurWordSetID("");
  };

  useEffect(() => {
    setWordSetCards(data.wordSetCards);
    setHaveMore(data.haveMore);
  }, [data, query]);

  const handleQueryMore = () => {
    if (!haveMore) return;
    setIsLoading(true);
    getRequest<SearchWordSetCardResponse>(
      `${PATH}/getWordSetCard/?query=${query}&curNumber=${curNumber}`,
      z.object({
        wordSetCards: z.array(WordSetCard_Zod),
        haveMore: z.boolean(),
      }),
    )
      .then((data) => {
        // sort in descending
        setWordSetCards((prev) =>
          [...prev, ...data.wordSetCards].sort(
            (a, b) => b.updatedAt - a.updatedAt,
          ),
        );
        setCurNumber((curNum) => curNum + data.wordSetCards.length);
        setHaveMore(data.haveMore);
      })
      .catch((error) => {
        setNotice(error as NoticeDisplay);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <>
      {curWordSetID !== "" && (
        <PreviewModal
          wordSetID={curWordSetID}
          title={curWordSet?.title || "單字集"}
          shouldSwap={curWordSet?.shouldSwap || false}
          closeModal={closeModal}
        />
      )}
      <div className="flex h-full w-full flex-col gap-4 bg-gray-100 px-[1rem] py-[1.5rem] sm:px-[2rem]">
        <h1 className="text-2xl text-black">
          搜尋「<b>{query}</b>」的結果
        </h1>
        {wordSetCards.length > 0 && (
          <h2 className="text-md mt-[1rem] sm:text-lg">單詞卡學習集</h2>
        )}
        <div className="grid w-full grid-cols-1 grid-rows-1 gap-x-[1rem] gap-y-[2rem] py-[1rem] sm:grid-cols-2 lg:grid-cols-3">
          {/* card */}
          {wordSetCards.length === 0 ? (
            <span className="text-2xl">查無單字集&#x1F921;</span>
          ) : (
            wordSetCards.map((wordSetCard) => {
              return (
                <div
                  key={wordSetCard.id}
                  title={wordSetCard.title}
                  onClick={() => navigate(`/wordSet/${wordSetCard.id}`)}
                  className="flex h-[230px] flex-col gap-4 rounded-lg border-2 border-gray-200 bg-white p-4 hover:cursor-pointer hover:border-gray-400"
                >
                  <h3 className="text-[1.2rem] font-bold break-words text-black">
                    {wordSetCard.title.length >= 23
                      ? wordSetCard.title.slice(0, 20) + "..."
                      : wordSetCard.title}
                  </h3>
                  <span className="light-content-normal w-max rounded-2xl bg-gray-300 px-2 text-[.8rem]">
                    {wordSetCard.wordCnt}個詞語
                  </span>
                  <div className="flex items-center gap-2">
                    <FaStar className="h-[1rem] w-[1rem] text-amber-300" />
                    <span>{wordSetCard.likes}</span>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <UserLink userID="f79a24f2-9b15-4406-b4e8-da82716b797f" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurWordSetID(wordSetCard.id);
                      }}
                      className="rounded-lg border-1 border-[var(--light-theme-color)] p-2 font-bold text-[var(--light-theme-color)] hover:cursor-pointer hover:bg-[var(--light-theme-color)] hover:text-white"
                    >
                      預覽
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="flex w-full items-center justify-center">
          {haveMore &&
            (isLoading ? (
              <ClipLoader size={32} />
            ) : (
              <button
                onClick={() => handleQueryMore()}
                className="font-bold text-[var(--light-theme-color)] hover:cursor-pointer"
              >
                顯示更多
              </button>
            ))}
        </div>
      </div>
    </>
  );
}
