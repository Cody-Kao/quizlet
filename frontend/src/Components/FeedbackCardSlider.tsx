import CardSlider from "./CardSlider";
import FeedbackCard from "./FeedbackCard";
import { FeedBackCard } from "../Types/types";
import { FeedBackCard_ZOD } from "../Types/zod_response";
import { useNavigate } from "react-router";
import { PATH } from "../Consts/consts";
import { getRequest } from "../Utils/getRequest";
import { FeedbackResponse } from "../Types/response";
import { z } from "zod";
import { use } from "react";

// cache the fetch promise outside the component
const feedbacksPromise = getRequest<FeedbackResponse>(
  `${PATH}/getFeedback/?curNumber=0`,
  z.object({
    feedbacks: z.array(FeedBackCard_ZOD),
    haveMore: z.boolean(),
  }),
);

export default function FeedbackCardSlider() {
  const data = use(feedbacksPromise); // if this throws, it bubbles to Suspense or ErrorBoundary
  const feedbacks = data.feedbacks;
  const haveMoreFeedbacks = data.haveMore;
  const navigate = useNavigate();

  return (
    <>
      <div className="mb-2 flex h-8 w-full items-center justify-between px-4 text-[1rem] font-medium">
        <p>建議與回饋</p>
        <div className="flex h-full items-center gap-4">
          <button
            onClick={() => navigate("/createFeedback", { replace: false })}
            className="font-bold text-[var(--light-theme-color)] hover:cursor-pointer hover:text-blue-700"
          >
            撰寫
          </button>
          <button
            onClick={() => navigate("/allFeedbacks", { replace: false })}
            className={`${haveMoreFeedbacks ? "" : "pointer-events-none text-gray-300"} font-bold text-[var(--light-theme-color)] underline underline-offset-2 hover:cursor-pointer hover:text-blue-700`}
          >
            查看全部
          </button>
        </div>
      </div>
      <CardSlider
        data={feedbacks}
        renderData={(feedback: FeedBackCard) => (
          <FeedbackCard
            key={feedback.id}
            feedback={feedback}
            style={{
              width: `${100 / feedbacks.length}%`,
            }}
          />
        )}
      />
    </>
  );
}
