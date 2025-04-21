import { twMerge } from "tailwind-merge";
import { WordSetCardType } from "../Types/types";
import UserLink from "./UserLink";

interface WordSetCardProps extends React.HTMLAttributes<HTMLDivElement> {
  card: WordSetCardType;
}

export default function WordSetCardComponent({
  card,
  className = "",
  style,
  onClick,
  ...restProps
}: WordSetCardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={twMerge(
        "box-border px-1 hover:cursor-pointer lg:px-2",
        className,
      )}
      {...restProps}
    >
      <div className="group/card relative flex h-full flex-col justify-between overflow-hidden rounded-lg border border-gray-300 p-4">
        <div>
          <span className="mb-2 block font-bold text-black">
            {card.title.length > 15
              ? card.title.slice(0, 12) + "..."
              : card.title}
          </span>
          <span className="rounded-2xl bg-gray-300 px-2 text-sm">
            {card.wordCnt} 個詞語
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <UserLink userID={card.authorID} />
        </div>
        {/* for hover effect */}
        <div className="absolute top-[95%] left-0 h-[20px] w-full bg-[var(--light-theme-opacity-color)] opacity-0 transition-all duration-200 group-hover/card:opacity-70"></div>
      </div>
    </div>
  );
}
