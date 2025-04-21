import { useEffect, useRef } from "react";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";

export default function MessageDisplay() {
  const { notice, setNotice } = useNoticeDisplayContextProvider();
  const timerRef = useRef<number>(0);
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (notice !== null) {
      timerRef.current = setTimeout(() => {
        setNotice(null);
      }, 3500);
    }

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [notice]);
  return (
    <>
      {notice !== null && (
        <div
          className={`${notice.type === "Success" ? "border-green-500 bg-green-200" : "border-red-500 bg-red-200"} absolute top-[6%] left-[50%] z-1000 flex min-w-[250px] translate-x-[-50%] items-center justify-center rounded-[5px] border-[1px] px-6 py-2 text-[1rem] text-black`}
        >
          {`${notice.payload.message} ${notice.type === "Success" ? "✅" : "❌"}`}
          <button
            onClick={() => setNotice(null)}
            className="absolute top-[2%] right-[2%] hover:cursor-pointer"
          >
            &#10006;
          </button>
        </div>
      )}
    </>
  );
}
