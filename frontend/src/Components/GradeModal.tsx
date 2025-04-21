import { HiOutlineSpeakerWave } from "react-icons/hi2";
import { gradeType } from "../Types/types";
import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Speaker } from "../Utils/utils";

export default function GradeModal({
  isOpen,
  correctCnt,
  total,
  grades,
  callback,
}: {
  isOpen: boolean;
  correctCnt: number;
  total: number;
  grades: gradeType[];
  callback: () => void;
}) {
  const percentage = Math.ceil((correctCnt / total) * 100);
  return (
    <div
      className={`${isOpen ? "visible top-[50%] opacity-100" : "invisible top-[40%] opacity-0"} fixed left-[50%] z-1000 flex h-[450px] w-[350px] translate-x-[-50%] translate-y-[-50%] flex-col items-center justify-start gap-4 overflow-y-scroll rounded-xl bg-white p-4 transition-all duration-300 sm:w-[420px]`}
    >
      <button
        onClick={() => callback()}
        className="absolute top-2 right-2 text-[1.5rem] hover:cursor-pointer"
      >
        &#10006;
      </button>
      <header className="flex flex-col items-center gap-4 text-[1.2rem]">
        <h1>成績</h1>
        <div className="h-[100px] w-[100px]">
          <CircularProgressbar
            value={percentage}
            text={`${correctCnt}/${total}`}
            styles={buildStyles({
              textColor: "var(--light-theme-color)",
              pathColor: "var(--light-theme-color)",
              trailColor: "#eee",
              textSize: "1rem",
            })}
          />
        </div>
      </header>
      <div className="flex w-full flex-[1] flex-col gap-4">
        {grades.map((grade, index) => {
          return (
            <div
              key={index}
              className={`${grade.skip ? "bg-amber-200" : ""} flex items-center justify-start gap-6 rounded-xl border-1 border-gray-500 px-4 py-2`}
            >
              <span className="flex aspect-square h-[1.2rem] w-[1.2rem] items-center justify-center rounded-full bg-gray-300 text-lg text-[.8rem] text-gray-500">
                {grade.numOfQuestion}
              </span>
              <div className="flex flex-col items-start gap-2">
                <span className="text-[1.2rem] text-black">{grade.q}</span>
                <span className="font-bold text-red-700">{grade.ans}</span>
              </div>
              <button
                onClick={() => {
                  Speaker(grade.q, grade.qSound);
                  Speaker(grade.ans, grade.ansSound);
                }}
                className="ml-auto hover:cursor-pointer"
              >
                <HiOutlineSpeakerWave className="h-6 w-6" />
              </button>
            </div>
          );
        })}
        {grades.length === 0 && (
          <p className="mt-4 flex h-full w-full items-start justify-center text-[1.2rem] font-bold text-black">
            給自己鼓勵300下! 你/妳超棒
          </p>
        )}
      </div>
    </div>
  );
}
