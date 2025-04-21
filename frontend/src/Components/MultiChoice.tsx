import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { VscDebugRestart } from "react-icons/vsc";
import { FaBackwardStep } from "react-icons/fa6";
import { AiOutlineRollback } from "react-icons/ai";
import { HiOutlineSpeakerWave } from "react-icons/hi2";
import { PiRanking } from "react-icons/pi";
import { useNavigate, useOutletContext } from "react-router";
import { FullWordCardType } from "../Types/response";
import { getRandomInt, shuffleArray, Speaker } from "../Utils/utils";
import { useLocalStorage } from "../Hooks/useLocalStorage";
import { useEffect, useRef, useState } from "react";
import {
  multiChoice,
  gradeType,
  multiChoiceRecordType,
  multiChoiceQuestion,
  Word,
} from "../Types/types";
import Loader from "./Loader";
import GradeModal from "./GradeModal";
import { createPortal } from "react-dom";

export default function MultiChoice() {
  const onMountRef = useRef<boolean>(true); // 第一次mount時候是true，可以當作一個guard防止useEffect執行
  const navigate = useNavigate();
  const { wordSet, isRandom, onlyStar } = useOutletContext<{
    wordSet: FullWordCardType;
    isRandom: boolean;
    onlyStar: boolean;
  }>();
  const [words, setWords] = useState<Word[]>(wordSet.words);

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

  const generateChoiceIndex = (
    min: number,
    max: number,
    usedIndex: number[],
  ): number => {
    let index;
    do {
      index = getRandomInt(min, max);
    } while (usedIndex.includes(index));
    return index;
  };

  const generateQuestions = (
    words: Word[],
    mode: boolean,
  ): multiChoiceQuestion[] => {
    const numOfChoice = Math.min(4, words.length);
    // mode => true => 順序隨機, 反之則為字母由小到大
    let questions: multiChoiceQuestion[] = [];
    if (mode) {
      words = shuffleArray<Word>(words);
    } else {
      words.sort((a, b) =>
        a.vocabulary.localeCompare(b.vocabulary, undefined, {
          sensitivity: "base",
        }),
      );
    }
    words.forEach((word, index) => {
      // 空選項的array
      const choices: multiChoice[] = Array(numOfChoice).fill(null);
      // 答案出現在array的某個index
      const answerIndex = getRandomInt(0, numOfChoice - 1);
      choices[answerIndex] = {
        description: word.vocabulary,
        sound: word.vocabularySound,
        isAnswer: true,
      };
      // 在words中這題已經被拿來當過選項的單字
      const usedIndex = [index];
      for (let i = 0; i < numOfChoice; i++) {
        if (i === answerIndex) continue;
        const choiceIndex = generateChoiceIndex(0, words.length - 1, usedIndex);
        usedIndex.push(choiceIndex);
        choices[i] = {
          description: words[choiceIndex].vocabulary,
          sound: words[choiceIndex].vocabularySound,
          isAnswer: false,
        };
      }
      const question: multiChoiceQuestion = {
        q: [word.definition, word.definitionSound],
        choices: choices,
      };
      questions.push(question);
    });
    return questions;
  };

  const [questions, setQuestions] = useLocalStorage<multiChoiceQuestion[]>(
    `${wordSet.id}-questions`,
    [],
  );
  const [allQuestions, setAllQuestions] = useLocalStorage<
    multiChoiceQuestion[]
  >(`${wordSet.id}-allQuestions`, []);
  const [starQuestions, setStarQuestions] = useLocalStorage<
    multiChoiceQuestion[]
  >(`${wordSet.id}-starQuestions`, []);

  // 結算的答題紀錄(紀錄那些問題是答錯的 並給出正確答案)
  const [gradeForAll, setGradeForAll] = useLocalStorage<gradeType[]>(
    `${wordSet.id}-gradeForAll`,
    [],
  );
  const [gradeForStar, setGradeForStar] = useLocalStorage<gradeType[]>(
    `${wordSet.id}-gradeForStar`,
    [],
  );

  const [isLoading, setIsLoading] = useState<boolean>(true);
  // 處理初始化words以及所有questions 以及當words改變時也改變words和所有questions
  useEffect(() => {
    console.log("useEffect for init");
    setIsLoading(true);
    const newWords = wordSet.shouldSwap
      ? wordSet.words.map((word) => ({
          ...word,
          vocabulary: word.definition,
          definition: word.vocabulary,
          vocabularySound: word.definitionSound,
          definitionSound: word.vocabularySound,
        }))
      : wordSet.words;
    const starWords = newWords.filter((word) => word.star);

    // 處理所有questions
    const newAllQuestions = generateQuestions(newWords, isRandom);
    const isAllQuestionDiff =
      JSON.stringify(newAllQuestions) !== JSON.stringify(allQuestions);
    if (isAllQuestionDiff) {
      setAllQuestions(newAllQuestions);
    }

    const newStarQuestions = generateQuestions(starWords, isRandom);
    const isStarQuestionDiff =
      JSON.stringify(newStarQuestions) !== JSON.stringify(starQuestions);
    if (isStarQuestionDiff) {
      setStarQuestions(newStarQuestions);
    }

    if (onlyStar) {
      setQuestions(newStarQuestions);
    } else {
      setQuestions(newAllQuestions);
    }

    setWords(
      newWords.sort((a, b) =>
        a.vocabulary.localeCompare(b.vocabulary, undefined, {
          sensitivity: "base",
        }),
      ),
    );
    setIsLoading(false);
  }, [wordSet]);

  // 處理random順序
  useEffect(() => {
    if (onMountRef.current || isLoading) {
      onMountRef.current = false;
      return;
    }
    setAllQuestions(generateQuestions(words, isRandom));
    setMultiChoiceRecordForAll(Array(words.length).fill(null));

    setStarQuestions(
      generateQuestions(
        words.filter((word) => word.star),
        isRandom,
      ),
    );
    setMultiChoiceRecordForStar(
      Array(words.filter((word) => word.star).length).fill(null),
    );

    handleFromStart();
  }, [isRandom]);

  // 1. Reset index when `onlyStar` changes
  useEffect(() => {
    if (isLoading) return;
    if (onlyStar) {
      setQuestions(starQuestions);
      setCurQuestionIndex(0); // Force reset
    } else {
      setQuestions(allQuestions);
    }
  }, [onlyStar, starQuestions, allQuestions]);

  useEffect(() => {
    if (questions.length > 0 && curQuestionIndex >= questions.length) {
      setCurQuestionIndex(0); // Auto-correct if index is out of bounds
    }
  }, [questions]);

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
  const [multiChoiceRecordForAll, setMultiChoiceRecordForAll] = useLocalStorage<
    multiChoiceRecordType[]
  >(
    `${wordSet.id}-multiChoiceRecordForAll`,
    Array(wordSet.words.length).fill(null), // 初始化全為null
  );
  const [multiChoiceRecordForStar, setMultiChoiceRecordForStar] =
    useLocalStorage<multiChoiceRecordType[]>(
      `${wordSet.id}-multiChoiceRecordForStar`,
      Array(wordSet.words.filter((word) => word.star).length).fill(null), // 初始化全為null
    );

  // 處理選擇後的動畫/紀錄選擇後的結果
  const allAnswered = onlyStar
    ? multiChoiceRecordForStar.every((r) => r !== null)
    : multiChoiceRecordForAll.every((r) => r !== null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [answerCorrect, setAnswerCorrect] = useState<boolean>(false);
  const [chosenIndex, setChosenIndex] = useState<number>(-1);
  const clickChoice = (isAnswer: boolean, index: number, skip: boolean) => {
    setAnswerCorrect(isAnswer);
    setChosenIndex(index);
    setIsAnimating(true);

    setTimeout(() => {
      // Check if this is NOT the last question before advancing
      const isLastQuestion = onlyStar
        ? curQuestionIndex === multiChoiceRecordForStar.length - 1
        : curQuestionIndex === multiChoiceRecordForAll.length - 1;

      if (!skip && !isLastQuestion) {
        handleNextCard();
      }

      setIsAnimating(false);

      // Update records
      const updateRecords = () => {
        if (onlyStar) {
          setMultiChoiceRecordForStar((prev) => {
            const newRecord = [...prev];
            newRecord[curQuestionIndex] = {
              // Fixed: Use newRecord instead of prev
              chosenIndex: index,
              isCorrect: isAnswer,
            };
            return newRecord;
          });

          if (!isAnswer || skip) {
            setGradeForStar((prev) => [
              ...prev,
              {
                skip: skip,
                numOfQuestion: curQuestionIndex + 1,
                q: questions[curQuestionIndex].q[0],
                ans:
                  questions[curQuestionIndex].choices.find((c) => c.isAnswer)
                    ?.description || "",
                qSound: questions[curQuestionIndex].q[1],
                ansSound:
                  questions[curQuestionIndex].choices.find((c) => c.isAnswer)
                    ?.sound || "zh-TW",
              },
            ]);
          }
        } else {
          setMultiChoiceRecordForAll((prev) => {
            const newRecord = [...prev];
            newRecord[curQuestionIndex] = {
              // Fixed: Use newRecord instead of prev
              chosenIndex: index,
              isCorrect: isAnswer,
            };
            return newRecord;
          });

          if (!isAnswer || skip) {
            setGradeForAll((prev) => [
              ...prev,
              {
                skip: skip,
                numOfQuestion: curQuestionIndex + 1,
                q: questions[curQuestionIndex].q[0],
                ans:
                  questions[curQuestionIndex].choices.find((c) => c.isAnswer)
                    ?.description || "",
                qSound: questions[curQuestionIndex].q[1],
                ansSound:
                  questions[curQuestionIndex].choices.find((c) => c.isAnswer)
                    ?.sound || "zh-TW",
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
      if (multiChoiceRecordForStar.every((choice) => choice !== null)) {
        timeOut = setTimeout(() => {
          setIsGradeModalOpen(true);
        }, 200);
      }
    } else {
      if (multiChoiceRecordForAll.every((choice) => choice !== null)) {
        timeOut = setTimeout(() => {
          setIsGradeModalOpen(true);
        }, 200);
      }
    }
    return () => {
      clearTimeout(timeOut);
    };
  }, [onlyStar, multiChoiceRecordForAll, multiChoiceRecordForStar]);

  const handleRestart = () => {
    handleFromStart();
    if (onlyStar) {
      setMultiChoiceRecordForStar(
        Array(wordSet.words.filter((word) => word.star).length).fill(null),
      );
      setGradeForStar([]);
    } else {
      setMultiChoiceRecordForAll(Array(wordSet.words.length).fill(null));
      setGradeForAll([]);
    }
  };

  const handleRegenerate = () => {
    handleRestart();
    let newQuestions: multiChoiceQuestion[];
    if (onlyStar) {
      newQuestions = generateQuestions(
        words.filter((word) => word.star),
        isRandom,
      );
      setStarQuestions(newQuestions);
    } else {
      newQuestions = generateQuestions(words, isRandom);
      setAllQuestions(newQuestions);
    }
    setQuestions(newQuestions);
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

  if (isLoading) {
    return <Loader />;
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
              onlyStar
                ? questions.length -
                  multiChoiceRecordForStar.reduce(
                    (prev, choice) =>
                      prev + (choice !== null ? (choice.isCorrect ? 0 : 1) : 1),
                    0,
                  )
                : questions.length -
                  multiChoiceRecordForAll.reduce(
                    (prev, choice) =>
                      prev + (choice !== null ? (choice.isCorrect ? 0 : 1) : 1),
                    0,
                  )
            }
            total={questions.length}
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
              <span className="text-[.8rem] sm:text-[1rem]">註釋</span>
              <div className="flex items-center justify-center gap-4">
                <div className="break-word text-sm font-bold text-black md:text-lg lg:text-2xl">
                  {questions[curQuestionIndex].q[0]}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    Speaker(
                      questions[curQuestionIndex].q[0],
                      questions[curQuestionIndex].q[1],
                    );
                  }}
                  className="relative after:invisible after:absolute after:top-[120%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white after:content-['播放'] hover:cursor-pointer hover:after:visible"
                >
                  <HiOutlineSpeakerWave className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Choices Section - Now pushed to the bottom if space allows */}
            <div className="flex flex-grow flex-col justify-end gap-4">
              {onlyStar ? (
                multiChoiceRecordForStar[curQuestionIndex] === null ? (
                  <>
                    <div className="relative w-full overflow-y-hidden">
                      <p>選擇正確的單字</p>
                      <span
                        className={`${isAnimating ? "top-0" : "top-full"} ${answerCorrect ? "text-green-600" : "text-red-600"} absolute left-[50%] translate-x-[-50%] font-bold transition-all duration-200`}
                      >
                        {answerCorrect ? "正確!" : "錯誤!"}
                      </span>
                    </div>
                    <div className="text-md grid grid-cols-1 grid-rows-4 gap-4 overflow-auto text-center text-black md:text-xl lg:grid-cols-2 lg:grid-rows-2 lg:text-2xl">
                      {questions[curQuestionIndex].choices.map(
                        (choice, index) => (
                          <span
                            key={index}
                            onClick={() =>
                              clickChoice(choice.isAnswer, index, false)
                            }
                            className={`${isAnimating && choice.isAnswer ? "border-green-500" : ""} ${isAnimating && answerCorrect === false && index === chosenIndex ? "border-red-500" : ""} flex flex-wrap items-center justify-start gap-3 rounded-xl border-2 border-gray-300 p-3 hover:cursor-pointer hover:border-gray-500`}
                          >
                            <span className="flex aspect-square h-[1.2rem] w-[1.2rem] items-center justify-center rounded-full bg-gray-300 text-lg text-[.8rem] break-all text-gray-500">
                              {index + 1}
                            </span>
                            {choice.description}
                          </span>
                        ),
                      )}
                    </div>
                    <span
                      onClick={() => {
                        // Find the correct answer index
                        const correctIndex = questions[
                          curQuestionIndex
                        ].choices.findIndex((choice) => choice.isAnswer);
                        clickChoice(true, correctIndex, true);
                      }}
                      className="mt-[1rem] flex items-center justify-center font-bold text-[var(--light-theme-opacity-color)] hover:cursor-pointer hover:text-blue-700"
                    >
                      直接看答案
                    </span>
                  </>
                ) : (
                  <>
                    <div className="relative w-full overflow-y-hidden">
                      <p>選擇正確的單字</p>
                      <span
                        className={`top-0 ${multiChoiceRecordForStar[curQuestionIndex].isCorrect ? "text-green-600" : "text-red-600"} absolute left-[50%] translate-x-[-50%] font-bold`}
                      >
                        {multiChoiceRecordForStar[curQuestionIndex].isCorrect
                          ? "正確!"
                          : "錯誤!"}
                      </span>
                    </div>
                    <div className="text-md grid grid-cols-1 grid-rows-4 gap-4 overflow-auto text-center text-black md:text-xl lg:grid-cols-2 lg:grid-rows-2 lg:text-2xl">
                      {questions[curQuestionIndex].choices.map(
                        (choice, index) => (
                          <span
                            key={index}
                            className={`${!multiChoiceRecordForStar[curQuestionIndex].isCorrect && multiChoiceRecordForStar[curQuestionIndex].chosenIndex === index ? "border-red-500" : ""} ${choice.isAnswer ? "border-green-500" : ""} pointer-events-none flex flex-wrap items-center justify-start gap-3 rounded-xl border-2 border-gray-300 p-3`}
                          >
                            <span className="flex aspect-square h-[1.2rem] w-[1.2rem] items-center justify-center rounded-full bg-gray-300 text-lg text-[.8rem] break-all text-gray-500">
                              {index + 1}
                            </span>
                            {choice.description}
                          </span>
                        ),
                      )}
                    </div>
                    {/* 維持版面的placeholder */}
                    <span className="mt-[1rem] flex items-center justify-center font-bold text-[var(--light-theme-opacity-color)] hover:cursor-pointer hover:text-blue-700"></span>
                  </>
                )
              ) : multiChoiceRecordForAll[curQuestionIndex] === null ? (
                <>
                  <div className="relative w-full overflow-y-hidden">
                    <p>選擇正確的單字</p>
                    <span
                      className={`${isAnimating ? "top-0" : "top-full"} ${answerCorrect ? "text-green-600" : "text-red-600"} absolute left-[50%] translate-x-[-50%] font-bold transition-all duration-200`}
                    >
                      {answerCorrect ? "正確!" : "錯誤!"}
                    </span>
                  </div>
                  <div className="text-md grid grid-cols-1 grid-rows-4 gap-4 overflow-auto text-center text-black md:text-xl lg:grid-cols-2 lg:grid-rows-2 lg:text-2xl">
                    {questions[curQuestionIndex].choices.map(
                      (choice, index) => (
                        <p
                          key={index}
                          onClick={() =>
                            clickChoice(choice.isAnswer, index, false)
                          }
                          className={`${isAnimating && choice.isAnswer ? "border-green-500" : ""} ${isAnimating && answerCorrect === false && index === chosenIndex ? "border-red-500" : ""} flex flex-wrap items-center justify-start gap-3 rounded-xl border-2 border-gray-300 p-3 hover:cursor-pointer hover:border-gray-500`}
                        >
                          <span className="flex aspect-square h-[1.2rem] w-[1.2rem] items-center justify-center rounded-full bg-gray-300 text-lg text-[.8rem] break-all text-gray-500">
                            {index + 1}
                          </span>
                          {choice.description}
                        </p>
                      ),
                    )}
                  </div>
                  <span
                    onClick={() => {
                      // Find the correct answer index
                      const correctIndex = questions[
                        curQuestionIndex
                      ].choices.findIndex((choice) => choice.isAnswer);
                      clickChoice(true, correctIndex, true);
                    }}
                    className="mt-[1rem] flex items-center justify-center font-bold text-[var(--light-theme-opacity-color)] hover:cursor-pointer hover:text-blue-700"
                  >
                    直接看答案
                  </span>
                </>
              ) : (
                <>
                  <div className="relative w-full overflow-y-hidden">
                    <p>選擇正確的單字</p>
                    <span
                      className={`top-0 ${multiChoiceRecordForAll[curQuestionIndex].isCorrect ? "text-green-600" : "text-red-600"} absolute left-[50%] translate-x-[-50%] font-bold`}
                    >
                      {multiChoiceRecordForAll[curQuestionIndex].isCorrect
                        ? "正確!"
                        : "錯誤!"}
                    </span>
                  </div>
                  <div className="text-md grid grid-cols-1 grid-rows-4 gap-4 overflow-auto text-center text-black md:text-xl lg:grid-cols-2 lg:grid-rows-2 lg:text-2xl">
                    {questions[curQuestionIndex].choices.map(
                      (choice, index) => (
                        <span
                          key={index}
                          className={`${!multiChoiceRecordForAll[curQuestionIndex].isCorrect && multiChoiceRecordForAll[curQuestionIndex].chosenIndex === index ? "border-red-500" : ""} ${choice.isAnswer ? "border-green-500" : ""} pointer-events-none flex flex-wrap items-center justify-start gap-3 rounded-xl border-2 border-gray-300 p-3`}
                        >
                          <span className="flex aspect-square h-[1.2rem] w-[1.2rem] items-center justify-center rounded-full bg-gray-300 text-lg text-[.8rem] break-all text-gray-500">
                            {index + 1}
                          </span>
                          {choice.description}
                        </span>
                      ),
                    )}
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
              {curQuestionIndex + 1} &nbsp; / &nbsp; {questions.length}
            </span>
          </div>
          <div className="flex flex-grow basis-4/10 items-center justify-start">
            <div
              onClick={() => handleNextCard()}
              className={`${curQuestionIndex === questions.length - 1 ? "pointer-events-none text-gray-300" : "border-gray-200 hover:bg-gray-100"} flex h-12 w-16 items-center justify-center rounded-full border-2 hover:cursor-pointer`}
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
                onClick={() => handleRegenerate()}
                className={`relative flex h-10 w-10 items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['重新出題'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
              >
                <VscDebugRestart className="h-6 w-6" />
              </div>
              <div
                onClick={() => handleRestart()}
                className={`${onlyStar === false && multiChoiceRecordForAll.every((record) => record === null) ? "pointer-events-none text-gray-300" : ""} ${onlyStar && multiChoiceRecordForStar.every((record) => record === null) ? "pointer-events-none text-gray-300" : ""} relative flex h-10 w-10 items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['重新嘗試'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
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
        <div className="mt-2 flex w-full items-center justify-center gap-6 md:hidden">
          <div
            onClick={() => setIsGradeModalOpen(true)}
            className={`${allAnswered ? "" : "pointer-events-none text-gray-300"} relative flex h-max w-10 flex-col items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['作答成績'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
          >
            <PiRanking className="h-6 w-6" />
            <span className="w-max text-[.8rem]">作答成績</span>
          </div>
          <div
            onClick={() => handleRegenerate()}
            className={`relative flex h-max w-10 flex-col items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['重新出題'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
          >
            <VscDebugRestart className="h-6 w-6" />
            <span className="w-max text-[.8rem]">重新出題</span>
          </div>
          <div
            onClick={() => handleRestart()}
            className={`${onlyStar === false && multiChoiceRecordForAll.every((record) => record === null) ? "pointer-events-none text-gray-300" : ""} ${onlyStar && multiChoiceRecordForStar.every((record) => record === null) ? "pointer-events-none text-gray-300" : ""} relative flex h-max w-10 flex-col items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['重新嘗試'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
          >
            <AiOutlineRollback className="h-6 w-6" />
            <span className="w-max text-[.8rem]">重新嘗試</span>
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
