import { useEffect, useRef, useState } from "react";
import { NoticeDisplay, Word } from "../Types/types";
import ClipLoader from "react-spinners/ClipLoader";
import { getRequest } from "../Utils/getRequest";
import { PATH } from "../Consts/consts";
import { WordSetCardPreview } from "../Types/response";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";
import { z } from "zod";
import { Word as Word_zod } from "../Types/zod_response";

export default function PreviewModal({
  wordSetID,
  title,
  shouldSwap,
  closeModal,
}: {
  wordSetID: string;
  title: string;
  shouldSwap: boolean;
  closeModal: () => void;
}) {
  const { setNotice } = useNoticeDisplayContextProvider();
  const controllerRef = useRef<AbortController>(null);
  const [previewWords, setPreviewWords] = useState<Word[]>([]);
  const [previewWordsNumber, setPreviewWordsNumber] = useState<number>(0); // 當前單字數量，之後最多一次多抓6個
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false); // 抓preview words時
  const [haveMore, setHaveMore] = useState<boolean>(true);

  const [isAtBottom, setIsAtBottom] = useState(false);
  const modalContentRef = useRef<HTMLDivElement | null>(null);

  const checkScrollPosition = () => {
    if (modalContentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = modalContentRef.current;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 5; // 5px buffer
      setIsAtBottom(atBottom);
    }
  };

  useEffect(() => {
    if (!wordSetID) return;

    const modalContent = modalContentRef.current;
    if (modalContent) {
      modalContent.addEventListener("scroll", checkScrollPosition);
      checkScrollPosition(); // 一開始打開就檢查

      return () => {
        modalContent.removeEventListener("scroll", checkScrollPosition);
      };
    }
  }, [wordSetID]);

  useEffect(() => {
    if (isAtBottom && haveMore) {
      // 抓取更多words
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      controllerRef.current = new AbortController();
      const signal = controllerRef.current?.signal;
      setIsPreviewLoading(true);
      getRequest<WordSetCardPreview>(
        `${PATH}/getPreviewWords/?wordSetID=${wordSetID}&curNumber=${previewWordsNumber}`,
        z.object({
          words: z.array(Word_zod),
          haveMore: z.boolean(),
        }),
        signal,
      )
        .then((data) => {
          console.log("data:", data.words);
          const newWords = shouldSwap
            ? data.words.map((word) => ({
                ...word,
                vocabulary: word.definition,
                definition: word.vocabulary,
              }))
            : data.words;
          console.log(newWords);
          setPreviewWords((prev) => [...prev, ...newWords]);
          setPreviewWordsNumber((prev) => prev + newWords.length);
          setHaveMore(data.haveMore);
        })
        .catch((error) => {
          if (error.type === "AbortError") {
            console.log(error.payload.message);
            return;
          }
          setNotice(error as NoticeDisplay);
        })
        .finally(() => {
          setIsPreviewLoading(false);
        });

      return () => {
        setIsPreviewLoading(false);
      };
    }
  }, [isAtBottom, shouldSwap]);

  useEffect(() => {
    // clean up function why the entire modal is unmounted
    return () => {
      setIsAtBottom(false);
      setPreviewWords([]);
      setPreviewWordsNumber(0);
      setHaveMore(true);
    };
  }, []);

  return (
    <>
      <div
        onClick={() => closeModal()}
        className="fixed inset-0 z-1000 h-screen w-screen bg-black opacity-[.3]"
      ></div>
      <div
        ref={modalContentRef}
        className="absolute top-[50%] left-[50%] z-1000 flex max-h-[60%] min-h-[150px] w-[80%] max-w-[550px] translate-x-[-50%] translate-y-[-50%] flex-col gap-6 overflow-y-scroll rounded-lg bg-gray-100 px-[2rem] py-[2rem] sm:max-h-[80%]"
      >
        <button
          onClick={() => closeModal()}
          className="absolute top-[3%] right-[3%] text-[1.2rem] font-bold text-black hover:cursor-pointer"
        >
          &#10005;
        </button>
        <h1 className="text-[1.3rem] font-bold break-all text-black sm:text-[2rem]">
          {title}
        </h1>
        {previewWords.map((word) => {
          return (
            <div
              key={word.id}
              className="flex w-full flex-col justify-center gap-2 border-b-1 border-gray-300 pb-2 text-black"
            >
              <span className="text-[1rem] font-bold sm:text-[1.2rem]">
                {word.vocabulary}
              </span>
              <span className="text-[1rem] sm:text-[1.5rem]">
                {word.definition}
              </span>
            </div>
          );
        })}
        {isPreviewLoading && (
          <div className="flex w-full items-center justify-center">
            <ClipLoader size={24} />
          </div>
        )}
      </div>
    </>
  );
}
