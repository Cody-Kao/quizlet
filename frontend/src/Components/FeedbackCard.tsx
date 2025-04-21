import React, { useState } from "react";
import { twMerge } from "tailwind-merge";
import { FeedBackCard } from "../Types/types";
import GenericModal from "./GenericModal";

interface FeedbackCardProps extends React.HTMLAttributes<HTMLDivElement> {
  feedback: FeedBackCard;
}

export default function FeedbackCard({
  feedback,
  className = "",
  style,
  ...restProps
}: FeedbackCardProps) {
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [curFeedbackModal, setCurFeedbackModal] = useState<FeedBackCard>(
    {} as FeedBackCard,
  );
  return (
    <>
      <GenericModal
        isModalOpen={isFeedbackModalOpen}
        handleClose={() => setIsFeedbackModalOpen(false)}
        data={curFeedbackModal}
        renderData={(curFeedbackModal: FeedBackCard) => (
          <div className="flex w-full flex-grow flex-col gap-3 overflow-y-scroll px-3">
            <h1 className="mt-[1rem] text-[1.2rem] font-bold text-black">
              {curFeedbackModal.title}
            </h1>
            <div className="break-all">{curFeedbackModal.content}</div>
            <span className="mt-auto ml-auto">
              {curFeedbackModal.formattedCreatedAt}
            </span>
          </div>
        )}
      />
      <div
        onClick={() => {
          setCurFeedbackModal(feedback);
          setIsFeedbackModalOpen(true);
        }}
        style={style}
        className={twMerge(
          "box-border px-1 hover:cursor-pointer lg:px-2",
          className,
        )}
        {...restProps}
      >
        <div
          className={`group/card relative flex h-full flex-col justify-between overflow-hidden rounded-lg border border-gray-300 p-4`}
        >
          <div>
            <span className="mb-2 block font-bold text-black">
              {feedback.title.length > 15
                ? feedback.title.slice(0, 12) + "..."
                : feedback.title}
            </span>
            <p>
              {feedback.content.length > 35
                ? feedback.content.slice(0, 32) + "..."
                : feedback.content}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {feedback.formattedCreatedAt}
          </div>
          {/* for hover effect */}
          <div className="absolute top-[95%] left-0 h-[20px] w-full bg-[var(--light-theme-opacity-color)] opacity-0 transition-all duration-200 group-hover/card:opacity-70"></div>
        </div>
      </div>
    </>
  );
}
