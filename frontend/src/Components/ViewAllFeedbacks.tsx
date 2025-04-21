import { useEffect, useState } from "react";
import { FeedbackResponse } from "../Types/response";
import ClipLoader from "react-spinners/ClipLoader";
import { getRequest } from "../Utils/getRequest";
import { PATH } from "../Consts/consts";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";
import { FeedBackCard, NoticeDisplay } from "../Types/types";
import FeedbackCard from "./FeedbackCard";
import { z } from "zod";
import { FeedBackCard_ZOD } from "../Types/zod_response";

export default function ViewAllFeedbacks({ data }: { data: FeedbackResponse }) {
  const { setNotice } = useNoticeDisplayContextProvider();
  const [feedbacks, setFeedbacks] = useState<FeedBackCard[]>(data.feedbacks);
  const [haveMore, setHaveMore] = useState<boolean>(data.haveMore);
  const [curNumber, setCurNumber] = useState<number>(data.feedbacks.length); // 目前有的總搜尋數量
  const [isLoading, setIsLoading] = useState<boolean>(false); // 抓新的wordSet Card時

  useEffect(() => {
    setFeedbacks(data.feedbacks);
    setHaveMore(data.haveMore);
  }, [data]);

  const handleQueryMore = () => {
    if (!haveMore) return;
    setIsLoading(true);
    getRequest<FeedbackResponse>(
      `${PATH}/getFeedback/?curNumber=${curNumber}`,
      z.object({
        feedbacks: z.array(FeedBackCard_ZOD),
        haveMore: z.boolean(),
      }),
    )
      .then((data) => {
        // sort in descending
        setFeedbacks((prev) =>
          [...prev, ...data.feedbacks].sort((a, b) =>
            b.formattedCreatedAt.localeCompare(a.formattedCreatedAt),
          ),
        );
        setCurNumber((curNum) => curNum + data.feedbacks.length);
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
      <div className="flex h-full w-full flex-col gap-4 bg-gray-100 px-[1rem] py-[1.5rem] sm:px-[2rem]">
        <h1 className="text-2xl text-black">所有建議與回饋</h1>

        <div className="grid w-full grid-cols-1 grid-rows-1 gap-x-[1rem] gap-y-[2rem] py-[1rem] sm:grid-cols-2 lg:grid-cols-3">
          {/* card */}
          {feedbacks.length === 0 ? (
            <span className="text-2xl">查無建議與回饋&#x1F921;</span>
          ) : (
            feedbacks.map((feedback) => {
              return (
                <FeedbackCard
                  key={feedback.id}
                  feedback={feedback}
                  className="rounded-lg bg-white p-0 lg:p-0"
                />
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
