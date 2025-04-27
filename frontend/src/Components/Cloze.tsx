import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { FaBackwardStep } from "react-icons/fa6";
import { AiOutlineRollback } from "react-icons/ai";
import { HiOutlineSpeakerWave } from "react-icons/hi2";
import { PiRanking } from "react-icons/pi";
import { useNavigate, useOutletContext } from "react-router";
import { FullWordCardType } from "../Types/response";
import { shuffleArray, Speaker } from "../Utils/utils";
import { useLocalStorage } from "../Hooks/useLocalStorage";
import { useEffect, useState, useRef } from "react";
import { gradeType, clozeRecordType, Word } from "../Types/types";
import GradeModal from "./GradeModal";
import { BiBulb } from "react-icons/bi";
import { createPortal } from "react-dom";

export default function Cloze() {
  const [isFirstRender, setIsFirstRender] = useState(true);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const { wordSet, isRandom, onlyStar } = useOutletContext<{
    wordSet: FullWordCardType;
    isRandom: boolean;
    onlyStar: boolean;
  }>();
  const [words, setWords] = useState<Word[]>(
    wordSet.shouldSwap
      ? wordSet.words.map((word) => ({
          ...word,
          vocabulary: word.definition,
          definition: word.vocabulary,
          vocabularySound: word.definitionSound,
          definitionSound: word.vocabularySound,
        }))
      : wordSet.words,
  );

  const [isHintOpenForAll, setIsHintOpenForAll] = useState<boolean[]>(
    Array(wordSet.words.length).fill(false),
  );
  const [isHintOpenForStar, setIsHintOpenForStar] = useState<boolean[]>(
    Array(wordSet.words.filter((word) => word.star).length).fill(false),
  );

  const [curQuestionIndex, setCurQuestionIndex, removeCurQuestionIndex] =
    useLocalStorage(`${wordSet.id}-curQuestionIndex`, 0);
  // 防止curQuestionIndex造成index of out bound的錯誤
  useEffect(() => {
    if (
      (onlyStar === false && curQuestionIndex >= wordSet.words.length) ||
      (onlyStar &&
        curQuestionIndex >= wordSet.words.filter((word) => word.star).length) ||
      curQuestionIndex < 0
    ) {
      removeCurQuestionIndex();
      navigate(0); // remove掉curQuestionIndex後頁面不會自動重整去產生新的，所以強制重整
    }
  }, [wordSet, curQuestionIndex]);

  // 結算的答題紀錄(紀錄那些問題是答錯的 並給出正確答案)
  const [gradeForAll, setGradeForAll, removeGradeForAll] = useLocalStorage<
    gradeType[]
  >(`${wordSet.id}-clozeGradeForAll`, []);
  const [gradeForStar, setGradeForStar, removeGradeForStar] = useLocalStorage<
    gradeType[]
  >(`${wordSet.id}-clozeGradeForStar`, []);

  useEffect(() => {
    let newWords = wordSet.shouldSwap
      ? wordSet.words.map((word) => ({
          ...word,
          vocabulary: word.definition,
          definition: word.vocabulary,
          vocabularySound: word.definitionSound,
          definitionSound: word.vocabularySound,
        }))
      : wordSet.words;
    if (isRandom) {
      newWords = shuffleArray(newWords);
    } else {
      newWords.sort((a, b) =>
        a.vocabulary.localeCompare(b.vocabulary, undefined, {
          sensitivity: "base",
        }),
      );
    }
    if (onlyStar) {
      newWords = newWords.filter((word) => word.star);
    }
    setWords(newWords);
    setIsHintOpenForAll(Array(wordSet.words.length).fill(false));
    setIsHintOpenForStar(
      Array(wordSet.words.filter((word) => word.star).length).fill(false),
    );
  }, [wordSet]);

  useEffect(() => {
    let newWords = wordSet.words;
    if (onlyStar) {
      setCurQuestionIndex(0);
      newWords = newWords.filter((word) => word.star);
    }
    newWords.sort((a, b) =>
      a.vocabulary.localeCompare(b.vocabulary, undefined, {
        sensitivity: "base",
      }),
    );
    setWords(newWords);
  }, [onlyStar]);

  // handle random
  useEffect(() => {
    if (isFirstRender) {
      setIsFirstRender(false);
      return;
    }
    if (isRandom) {
      setWords((prev) => shuffleArray(prev));
    } else {
      setWords((prev) =>
        [...prev].sort((a, b) =>
          a.vocabulary.localeCompare(b.vocabulary, undefined, {
            sensitivity: "base",
          }),
        ),
      );
    }
    if (onlyStar) {
      setClozeRecordForStar(
        Array(words.filter((word) => word.star).length).fill(null),
      );
      setGradeForStar([]);
      setIsHintOpenForStar(
        Array(wordSet.words.filter((word) => word.star).length).fill(false),
      );
    } else {
      setClozeRecordForAll(Array(words.length).fill(null));
      setGradeForAll([]);
      setIsHintOpenForAll(Array(wordSet.words.length).fill(false));
    }
  }, [isRandom]);

  useEffect(() => {
    if (words.length > 0 && curQuestionIndex >= words.length) {
      setCurQuestionIndex(0); // Auto-correct if index is out of bounds
    }
  }, [words]);

  const [slideDirection, setSlideDirection] = useState<string | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const handlePrevCard = () => {
    if (curQuestionIndex > 0) {
      setSlideDirection("left");
      setTimeout(() => {
        setCurQuestionIndex((prev) => Math.max(0, prev - 1));
      }, 100); // Half the transition time for smoother effect
    }
  };

  const handleNextCard = () => {
    if (curQuestionIndex < words.length - 1) {
      setSlideDirection("right");
      setTimeout(() => {
        setCurQuestionIndex((prev) => Math.min(words.length - 1, prev + 1));
      }, 100); // Half the transition time for smoother effect
    }
  };
  const handleFromStart = () => {
    setSlideDirection("left");
    setTimeout(() => {
      setCurQuestionIndex(0);
    }, 100); // Half the transition time for smoother effect
  };

  // Handle the slide animation effect
  useEffect(() => {
    if (slideDirection) {
      setIsSliding(true);
      const timer = setTimeout(() => {
        setIsSliding(false);
        setSlideDirection(null);
      }, 200); // Match the transition duration
      return () => clearTimeout(timer);
    }
  }, [slideDirection]);

  // Get slide animation classes
  const getSlideClasses = () => {
    if (!isSliding) return "";
    return slideDirection === "left"
      ? "translate-x-[-100%] opacity-0"
      : "translate-x-[100%] opacity-0";
  };

  // 紀錄玩家選擇過的結果，上面是給全選的，下面是給星號的
  const [clozeRecordForAll, setClozeRecordForAll, removeClozeRecordForAll] =
    useLocalStorage<clozeRecordType[]>(
      `${wordSet.id}-clozeRecordForAll`,
      Array(wordSet.words.length).fill(null), // 初始化全為null
    );
  const [clozeRecordForStar, setClozeRecordForStar, removeClozeRecordForStar] =
    useLocalStorage<clozeRecordType[]>(
      `${wordSet.id}-clozeRecordForStar`,
      Array(wordSet.words.filter((word) => word.star).length).fill(null), // 初始化全為null
    );

  // 處理選擇後的動畫/紀錄選擇後的結果
  const allAnswered = onlyStar
    ? clozeRecordForStar.every((r) => r !== null)
    : clozeRecordForAll.every((r) => r !== null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [answerCorrect, setAnswerCorrect] = useState<boolean>(false);
  const submitAnswer = (
    q: string,
    ans: string,
    qSound: string,
    ansSound: string,
    userAns: string,
    skip: boolean,
  ) => {
    const isAnswer = ans === userAns;
    setIsAnimating(true);
    setAnswerCorrect(isAnswer);
    setTimeout(() => {
      // Check if this is NOT the last question before advancing
      const isLastQuestion = onlyStar
        ? curQuestionIndex === clozeRecordForStar.length - 1
        : curQuestionIndex === clozeRecordForAll.length - 1;

      if (!skip && !isLastQuestion) {
        handleNextCard();
      }

      setIsAnimating(false);
      // Update records
      const updateRecords = () => {
        if (onlyStar) {
          setClozeRecordForStar((prev) => {
            const newRecord = [...prev];
            newRecord[curQuestionIndex] = {
              // Fixed: Use newRecord instead of prev
              ans: ans,
              userAns: userAns,
              isCorrect: skip ? false : isAnswer,
            };
            return newRecord;
          });

          if (!isAnswer || skip) {
            setGradeForStar((prev) => [
              ...prev,
              {
                skip: skip,
                numOfQuestion: curQuestionIndex + 1,
                q: q,
                ans: ans,
                qSound: qSound,
                ansSound: ansSound,
              },
            ]);
          }
        } else {
          setClozeRecordForAll((prev) => {
            const newRecord = [...prev];
            newRecord[curQuestionIndex] = {
              // Fixed: Use newRecord instead of prev
              ans: ans,
              userAns: userAns,
              isCorrect: skip ? false : isAnswer,
            };
            return newRecord;
          });

          if (!isAnswer || skip) {
            setGradeForAll((prev) => [
              ...prev,
              {
                skip: skip,
                numOfQuestion: curQuestionIndex + 1,
                q: q,
                ans: ans,
                qSound: qSound,
                ansSound: ansSound,
              },
            ]);
          }
        }
      };

      updateRecords();

      // Only check for completion after all state updates
      setTimeout(() => {
        if (allAnswered) {
          setIsGradeModalOpen(true);
        }
      }, 100); // Small delay to ensure state is updated
    }, 2000);
  };
  // 確認是否結束需要進入結算畫面
  const [isGradeModalOpen, setIsGradeModalOpen] = useState<boolean>(false);
  useEffect(() => {
    let timeOut = 0;
    if (onlyStar) {
      if (clozeRecordForStar.every((choice) => choice !== null)) {
        timeOut = setTimeout(() => {
          setIsGradeModalOpen(true);
        }, 200);
      }
    } else {
      if (clozeRecordForAll.every((choice) => choice !== null)) {
        timeOut = setTimeout(() => {
          setIsGradeModalOpen(true);
        }, 200);
      }
    }
    return () => {
      clearTimeout(timeOut);
    };
  }, [onlyStar, clozeRecordForAll, clozeRecordForStar]);

  const handleRestart = () => {
    handleFromStart();
    if (onlyStar) {
      setClozeRecordForStar(
        Array(wordSet.words.filter((word) => word.star).length).fill(null),
      );

      setIsHintOpenForStar(
        Array(wordSet.words.filter((word) => word.star).length).fill(false),
      );
      setGradeForStar([]);
    } else {
      setClozeRecordForAll(Array(wordSet.words.length).fill(null));
      setIsHintOpenForAll(Array(wordSet.words.length).fill(false));
      setGradeForAll([]);
    }
  };

  // 處理在input按下enter去觸發button的onClick
  const enterSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (buttonRef.current === null) return;
    if (e.key === "Enter") {
      e.preventDefault();
      buttonRef.current.click(); // Programmatically click the button
    }
  };

  // Prevent rendering while the index is out of bound
  if (
    !wordSet.words.length ||
    (onlyStar === false && curQuestionIndex >= wordSet.words.length) ||
    (onlyStar &&
      curQuestionIndex >= wordSet.words.filter((word) => word.star).length) ||
    curQuestionIndex < 0
  ) {
    return null;
  }

  // 如果wordSet改變了(新增了單字)導致原本localStorage的array不夠用(會index out of bound)，則先return null
  // 再透過useEffect重置，並重整頁面
  useEffect(() => {
    if (wordSet.words.length > clozeRecordForAll.length) {
      removeCurQuestionIndex();
      removeClozeRecordForAll();
      removeClozeRecordForStar();
      removeGradeForAll();
      removeGradeForStar();
      navigate(0);
    }
  }, [wordSet]);
  if (wordSet.words.length > clozeRecordForAll.length) {
    return null;
  }

  return (
    <>
      {/* overlay for grade modal */}
      {createPortal(
        <>
          <div
            onClick={() => {
              setIsGradeModalOpen(false);
            }}
            className={`${isGradeModalOpen ? "visible opacity-[.3]" : "invisible opacity-0"} fixed inset-0 z-1000 h-full w-full bg-black transition-opacity duration-300 ease-in-out`}
          ></div>

          <GradeModal
            isOpen={isGradeModalOpen}
            correctCnt={
              words.length -
              (onlyStar
                ? clozeRecordForStar.reduce(
                    (prev, r) =>
                      prev + (r !== null ? (r.isCorrect ? 0 : 1) : 0),
                    0,
                  )
                : clozeRecordForAll.reduce(
                    (prev, r) =>
                      prev + (r !== null ? (r.isCorrect ? 0 : 1) : 0),
                    0,
                  ))
            }
            total={words.length}
            grades={
              onlyStar
                ? gradeForStar.sort((a, b) => a.numOfQuestion - b.numOfQuestion)
                : gradeForAll.sort((a, b) => a.numOfQuestion - b.numOfQuestion)
            }
            callback={() => setIsGradeModalOpen(false)}
          />
        </>,
        document.body,
      )}

      {/* 在播放時要放置overlay 以防user亂按 */}
      {isAnimating && (
        <div className="absolute z-10 h-full w-full bg-transparent"></div>
      )}
      <div className="relative flex min-h-[500px] max-w-full min-w-0 flex-grow flex-col">
        <div
          className={`relative flex w-full flex-col gap-2 rounded-xl bg-white px-6 py-4 shadow-2xl ring ring-gray-300 transition-all duration-200 ${getSlideClasses()}`}
        >
          <div className="flex flex-grow flex-col gap-[2rem] sm:min-h-[400px]">
            {/* Header */}
            <div className="flex flex-none flex-col items-start justify-start gap-2 sm:gap-4">
              <p className="flex items-center gap-2 text-[.8rem] sm:text-[1rem]">
                題目:
                <span className="flex aspect-square h-[1rem] w-[1rem] items-center justify-center rounded-full bg-gray-300 sm:h-[1.2rem] sm:w-[1.2rem]">
                  {curQuestionIndex + 1}
                </span>
              </p>
              <span className="text-[.8rem] sm:text-[1rem]">
                {wordSet.shouldSwap ? "單字" : "註釋"}
              </span>
              <div className="flex items-center justify-center gap-4">
                <div className="break-word text-sm font-bold text-black md:text-lg lg:text-2xl">
                  {words[curQuestionIndex].definition}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    Speaker(
                      words[curQuestionIndex].definition,
                      words[curQuestionIndex].definitionSound,
                    );
                  }}
                  className="relative after:invisible after:absolute after:top-[120%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white after:content-['播放'] hover:cursor-pointer hover:after:visible"
                >
                  <HiOutlineSpeakerWave className="h-6 w-6" />
                </button>
              </div>
              <div
                onClick={() => {
                  if (onlyStar) {
                    setIsHintOpenForStar((prev) =>
                      prev.map((cur, index) =>
                        index === curQuestionIndex ? !cur : cur,
                      ),
                    );
                  } else {
                    setIsHintOpenForAll((prev) =>
                      prev.map((cur, index) =>
                        index === curQuestionIndex ? !cur : cur,
                      ),
                    );
                  }
                }}
                className={`${onlyStar === false && isHintOpenForAll[curQuestionIndex] ? "bg-gray-200 px-2" : ""} ${onlyStar && isHintOpenForStar[curQuestionIndex] ? "bg-gray-200 px-2" : ""} flex items-center justify-center gap-2 rounded-full py-1 font-bold hover:cursor-pointer`}
              >
                <BiBulb className="h-4 w-4 sm:h-6 sm:w-6" />
                <span className="text-sm sm:text-lg">
                  {onlyStar
                    ? isHintOpenForStar[curQuestionIndex]
                      ? words[curQuestionIndex].vocabulary[0] +
                        "_".repeat(
                          words[curQuestionIndex].vocabulary.length - 1,
                        )
                      : "顯示提示"
                    : isHintOpenForAll[curQuestionIndex]
                      ? words[curQuestionIndex].vocabulary[0] +
                        "_".repeat(
                          words[curQuestionIndex].vocabulary.length - 1,
                        )
                      : "顯示提示"}
                </span>
              </div>
            </div>

            {/* Ans input Section */}
            <div className="flex flex-grow flex-col justify-end gap-4">
              {onlyStar ? (
                clozeRecordForStar[curQuestionIndex] === null ? (
                  <>
                    <div className="relative w-full overflow-y-hidden">
                      <p>你的答案</p>
                      <span
                        className={`${isAnimating ? "top-0" : "top-full"} ${answerCorrect ? "text-green-600" : "text-red-600"} absolute left-[50%] translate-x-[-50%] font-bold transition-all duration-200`}
                      >
                        {answerCorrect ? "正確!" : "錯誤!"}
                      </span>
                    </div>
                    <div className="flex w-full flex-[1] flex-col gap-6">
                      <div className="relative overflow-y-hidden pb-[2rem]">
                        <input
                          ref={inputRef}
                          onKeyDown={(e) => enterSubmit(e)}
                          className={`${isAnimating ? (answerCorrect ? "border-green-600" : "border-red-600") : "border-transparent"} flex h-[3rem] w-full items-center rounded-lg border-2 bg-gray-200 px-2 py-3 font-bold text-black outline-none focus:border-[var(--light-theme-opacity-color)] focus:bg-white`}
                          placeholder="輸入答案"
                        ></input>
                        <div
                          className={`${isAnimating ? "bottom-0" : "bottom-[-25%]"} absolute left-0 font-bold text-green-600 transition-all duration-200`}
                        >
                          {words[curQuestionIndex].vocabulary}
                        </div>
                      </div>
                    </div>
                    <div className="flex w-full items-center justify-end gap-4">
                      <button
                        ref={buttonRef}
                        onClick={() => {
                          submitAnswer(
                            words[curQuestionIndex].definition,
                            words[curQuestionIndex].vocabulary,
                            words[curQuestionIndex].definitionSound,
                            words[curQuestionIndex].vocabularySound,
                            words[curQuestionIndex].vocabulary,
                            true,
                          );
                        }}
                        className="font-bold text-[var(--light-theme-opacity-color)] hover:cursor-pointer hover:text-blue-700"
                      >
                        直接看答案
                      </button>
                      <button
                        ref={buttonRef}
                        onClick={() => {
                          submitAnswer(
                            words[curQuestionIndex].definition,
                            words[curQuestionIndex].vocabulary,
                            words[curQuestionIndex].definitionSound,
                            words[curQuestionIndex].vocabularySound,
                            inputRef.current?.value || "",
                            false,
                          );
                        }}
                        className="rounded-lg bg-[var(--light-theme-color)] p-2 font-bold text-white hover:cursor-pointer hover:font-bold sm:font-light"
                      >
                        回答
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative w-full overflow-y-hidden">
                      <p>你的答案</p>
                      <span
                        className={`top-0 ${clozeRecordForStar[curQuestionIndex].isCorrect ? "text-green-600" : "text-red-600"} absolute left-[50%] translate-x-[-50%] font-bold`}
                      >
                        {clozeRecordForStar[curQuestionIndex].isCorrect
                          ? "正確!"
                          : "錯誤!"}
                      </span>
                    </div>
                    <div className="flex w-full flex-[1] flex-col gap-4">
                      {/* 你的錯誤答案 */}
                      {clozeRecordForStar[curQuestionIndex].isCorrect ===
                        false && (
                        <div className="flex h-[3rem] w-full items-center rounded-lg border-2 border-red-500 bg-gray-200 px-2 py-3 text-black outline-none">
                          {clozeRecordForStar[curQuestionIndex].userAns}
                        </div>
                      )}

                      {/* 正確答案 */}
                      <div className="flex h-[3rem] w-full items-center rounded-lg border-2 border-green-500 px-2 py-3 font-bold text-black outline-none">
                        {clozeRecordForStar[curQuestionIndex].ans}
                      </div>
                    </div>
                    {/* 維持版面的placeholder */}
                    <span className="mt-[1rem] flex items-center justify-center font-bold text-[var(--light-theme-opacity-color)] hover:cursor-pointer hover:text-blue-700"></span>
                  </>
                )
              ) : clozeRecordForAll[curQuestionIndex] === null ? (
                <>
                  <div className="relative w-full overflow-y-hidden">
                    <p>你的答案</p>
                    <span
                      className={`${isAnimating ? "top-0" : "top-full"} ${answerCorrect ? "text-green-600" : "text-red-600"} absolute left-[50%] translate-x-[-50%] font-bold transition-all duration-200`}
                    >
                      {answerCorrect ? "正確!" : "錯誤!"}
                    </span>
                  </div>
                  <div className="flex w-full flex-[1] flex-col gap-6">
                    <div className="relative overflow-y-hidden pb-[2rem]">
                      <input
                        ref={inputRef}
                        onKeyDown={(e) => enterSubmit(e)}
                        className={`${isAnimating ? (answerCorrect ? "border-green-600" : "border-red-600") : "border-transparent"} flex h-[3rem] w-full items-center rounded-lg border-2 bg-gray-200 px-2 py-3 font-bold text-black outline-none focus:border-[var(--light-theme-opacity-color)] focus:bg-white`}
                        placeholder="輸入答案"
                      ></input>
                      <div
                        className={`${isAnimating ? "bottom-0" : "bottom-[-25%]"} absolute left-0 font-bold text-green-600 transition-all duration-200`}
                      >
                        {words[curQuestionIndex].vocabulary}
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-end gap-4">
                    <button
                      ref={buttonRef}
                      onClick={() => {
                        submitAnswer(
                          words[curQuestionIndex].definition,
                          words[curQuestionIndex].vocabulary,
                          words[curQuestionIndex].definitionSound,
                          words[curQuestionIndex].vocabularySound,
                          words[curQuestionIndex].vocabulary,
                          true,
                        );
                      }}
                      className="font-bold text-[var(--light-theme-opacity-color)] hover:cursor-pointer hover:text-blue-700"
                    >
                      直接看答案
                    </button>
                    <button
                      ref={buttonRef}
                      onClick={() => {
                        submitAnswer(
                          words[curQuestionIndex].definition,
                          words[curQuestionIndex].vocabulary,
                          words[curQuestionIndex].definitionSound,
                          words[curQuestionIndex].vocabularySound,
                          inputRef.current?.value || "",
                          false,
                        );
                      }}
                      className="rounded-lg bg-[var(--light-theme-color)] p-2 font-bold text-white hover:cursor-pointer hover:font-bold sm:font-light"
                    >
                      回答
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative w-full overflow-y-hidden">
                    <p>你的答案</p>
                    <span
                      className={`top-0 ${clozeRecordForAll[curQuestionIndex].isCorrect ? "text-green-600" : "text-red-600"} absolute left-[50%] translate-x-[-50%] font-bold`}
                    >
                      {clozeRecordForAll[curQuestionIndex].isCorrect
                        ? "正確!"
                        : "錯誤!"}
                    </span>
                  </div>
                  <div className="flex w-full flex-[1] flex-col gap-4">
                    {/* 你的錯誤答案 */}
                    {clozeRecordForAll[curQuestionIndex].isCorrect ===
                      false && (
                      <div className="flex h-[3rem] w-full items-center rounded-lg border-2 border-red-500 bg-gray-200 px-2 py-3 text-black outline-none">
                        {clozeRecordForAll[curQuestionIndex].userAns}
                      </div>
                    )}

                    {/* 正確答案 */}
                    <div className="flex h-[3rem] w-full items-center rounded-lg border-2 border-green-500 px-2 py-3 font-bold text-black outline-none">
                      {clozeRecordForAll[curQuestionIndex].ans}
                    </div>
                  </div>
                  {/* 維持版面的placeholder */}
                  <span className="mt-[1rem] flex items-center justify-center font-bold text-[var(--light-theme-opacity-color)] hover:cursor-pointer hover:text-blue-700"></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Control Section */}
        <div className="mt-2 flex h-[60px] w-full py-2 sm:flex-grow">
          <div className="flex flex-grow basis-4/10 items-center justify-end">
            <div
              onClick={() => handlePrevCard()}
              className={`${curQuestionIndex === 0 ? "pointer-events-none text-gray-300" : "border-gray-200 hover:bg-gray-100"} flex h-12 w-16 items-center justify-center rounded-full border-2 hover:cursor-pointer`}
            >
              <FaArrowLeft className="h-6 w-6" />
            </div>
          </div>
          <div className="flex max-w-[100px] min-w-[90px] basis-2/10 items-center justify-center gap-4">
            <span className="text-[1.2rem] font-bold">
              {curQuestionIndex + 1} &nbsp; / &nbsp; {words.length}
            </span>
          </div>
          <div className="flex flex-grow basis-4/10 items-center justify-start">
            <div
              onClick={() => handleNextCard()}
              className={`${curQuestionIndex === words.length - 1 ? "pointer-events-none text-gray-300" : "border-gray-200 hover:bg-gray-100"} flex h-12 w-16 items-center justify-center rounded-full border-2 hover:cursor-pointer`}
            >
              <FaArrowRight className="h-6 w-6" />
            </div>
            <div className="ml-auto hidden gap-2 md:flex xl:gap-6">
              <div
                onClick={() => setIsGradeModalOpen(true)}
                className={`${allAnswered ? "" : "pointer-events-none text-gray-300"} relative flex h-10 w-10 items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['作答成績'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
              >
                <PiRanking className="h-6 w-6" />
              </div>
              <div
                onClick={() => handleRestart()}
                className={`${onlyStar === false && clozeRecordForAll.every((record) => record === null) ? "pointer-events-none text-gray-300" : ""} ${onlyStar && clozeRecordForStar.every((record) => record === null) ? "pointer-events-none text-gray-300" : ""} relative flex h-10 w-10 items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['重新嘗試'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
              >
                <AiOutlineRollback className="h-6 w-6" />
              </div>
              <div
                onClick={() => handleFromStart()}
                className={`${curQuestionIndex === 0 ? "pointer-events-none text-gray-300" : ""} relative flex h-10 w-10 items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['回到第一張'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
              >
                <FaBackwardStep className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
        {/* 小螢幕把剩下的操作按鈕移下去 */}
        <div className="flex w-full items-center justify-center gap-6 md:hidden">
          <div
            onClick={() => setIsGradeModalOpen(true)}
            className={`${allAnswered ? "" : "pointer-events-none text-gray-300"} relative flex h-max w-10 flex-col items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['作答成績'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
          >
            <PiRanking className="h-6 w-6" />
            <span className="w-max text-[.8rem]">作答成績</span>
          </div>
          <div
            onClick={() => handleRestart()}
            className={`${onlyStar === false && clozeRecordForAll.every((record) => record === null) ? "pointer-events-none text-gray-300" : ""} ${onlyStar && clozeRecordForStar.every((record) => record === null) ? "pointer-events-none text-gray-300" : ""} relative flex h-max w-10 flex-col items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['重新嘗試'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
          >
            <AiOutlineRollback className="h-6 w-6" />
            <span className="w-max text-[.8rem]">重新出題</span>
          </div>
          <div
            onClick={() => handleFromStart()}
            className={`${curQuestionIndex === 0 ? "pointer-events-none text-gray-300" : ""} relative flex h-max w-10 flex-col items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['回到第一題'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
          >
            <FaBackwardStep className="h-6 w-6" />
            <span className="w-max text-[.8rem]">回到第一題</span>
          </div>
        </div>
      </div>
    </>
  );
}
