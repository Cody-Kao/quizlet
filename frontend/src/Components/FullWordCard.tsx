import { useState, useEffect, useRef } from "react";
import { BiBulb } from "react-icons/bi";
import { HiOutlineSpeakerWave } from "react-icons/hi2";
import { FaArrowLeft, FaArrowRight, FaPlay } from "react-icons/fa";
import { LiaRandomSolid } from "react-icons/lia";
import { FaBackwardStep } from "react-icons/fa6";
import { FaPause } from "react-icons/fa6";
import { Word } from "../Types/types";
import {
  getRandomInt,
  AutoPlaySpeaker,
  Speaker,
  shuffleArray,
} from "../Utils/utils";
import { useNavigate, useOutletContext } from "react-router";
import { FullWordCardType } from "../Types/response";
import { useLocalStorage } from "../Hooks/useLocalStorage";

const FullWordCard = () => {
  const navigate = useNavigate();
  const { wordSet, isRandom, onlyStar, setIsCardAutoPlaying } =
    useOutletContext<{
      wordSet: FullWordCardType;
      isRandom: boolean;
      onlyStar: boolean;
      setIsCardAutoPlaying: React.Dispatch<React.SetStateAction<boolean>>; // 讓parent知道是否在auto play
    }>(); // this is the wordSet for FullWordCardType
  const [isCardFlip, setIsCardFlip] = useState(false);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [curWordIndex, setCurWordIndex, removeCurWordIndex] = useLocalStorage(
    `${wordSet.id}-curWordIndex`,
    0,
  );
  // 防止curWordIndex造成index of out bound的錯誤
  useEffect(() => {
    if (curWordIndex >= wordSet.words.length || curWordIndex < 0) {
      removeCurWordIndex();
      navigate(0); // remove掉curWordIndex後頁面不會自動重整去產生新的，所以強制重整
    }
  }, [wordSet, curWordIndex]);

  // Prevent rendering while the index is out of bound
  if (!wordSet.words.length || curWordIndex >= wordSet.words.length) {
    return null;
  }

  const [slideDirection, setSlideDirection] = useState<string | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const autoPlayTimerRef = useRef<number | null>(null);
  const soundPlayTimerRef = useRef<number | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null); // Store speech instance
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
  if (words.length === 0) {
    return null;
  }

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
  }, [wordSet]);

  useEffect(() => {
    let newWords = wordSet.words;
    if (onlyStar) {
      setCurWordIndex(0);
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
  }, [isRandom]);

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

  const handlePrevCard = () => {
    if (curWordIndex > 0) {
      setSlideDirection("left");
      setIsCardFlip(false);
      setIsHintOpen(false);
      setTimeout(() => {
        setCurWordIndex((prev) => Math.max(0, prev - 1));
      }, 100); // Half the transition time for smoother effect
    }
  };

  const handleNextCard = () => {
    if (curWordIndex < words.length - 1) {
      setSlideDirection("right");
      setIsCardFlip(false);
      setIsHintOpen(false);
      setTimeout(() => {
        setCurWordIndex((prev) => Math.min(words.length - 1, prev + 1));
      }, 100); // Half the transition time for smoother effect
    }
  };
  const handleFromStart = () => {
    setSlideDirection("left");
    setIsCardFlip(false);
    setIsHintOpen(false);
    setTimeout(() => {
      setCurWordIndex(0);
    }, 100); // Half the transition time for smoother effect
  };

  // Get slide animation classes
  const getSlideClasses = () => {
    if (!isSliding) return "";
    return slideDirection === "left"
      ? "translate-x-[-100%] opacity-0"
      : "translate-x-[100%] opacity-0";
  };

  // for auto playing
  const startAutoPlaySequence = async (curWordIndexConst: number) => {
    // 防止在已經開始後出現重疊的autoPlay
    // 但recursion的行為仍能夠達成是因為closure，所以isAutoPlaying還是false的狀態
    if (isAutoPlaying) return;

    // Show front side for 3 seconds
    setIsCardFlip(false);
    try {
      soundPlayTimerRef.current = setTimeout(async () => {
        await AutoPlaySpeaker(
          words[curWordIndexConst].vocabulary,
          words[curWordIndexConst].vocabularySound,
          speechRef,
        );
        // Flip to back side and show for 2 seconds
        setIsCardFlip(true);
        autoPlayTimerRef.current = setTimeout(() => {
          // Move to next card if not at the end
          handleNextCard();
          if (curWordIndexConst + 1 === words.length) {
            stopPlaying();
          } else {
            startAutoPlaySequence(curWordIndexConst + 1);
          }
        }, 2000); // Show back for 2 seconds
      }, 300);
    } catch (error) {
      console.log("Playback was stopped:", error);
      stopPlaying();
    }
  };

  const stopPlaying = () => {
    // Stop any running timers
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (soundPlayTimerRef.current) {
      clearTimeout(soundPlayTimerRef.current);
      soundPlayTimerRef.current = null;
    }

    // Stop speech synthesis if it's active
    if (speechRef.current) {
      speechSynthesis.cancel(); // Stops the speech immediately
      speechRef.current = null;
    }
    setIsCardAutoPlaying(false);
    setIsAutoPlaying(false);
  };

  const toggleAutoPlay = () => {
    if (!isAutoPlaying) {
      // Start the auto-play sequence
      setIsAutoPlaying(true);
      startAutoPlaySequence(curWordIndex);
      setIsCardAutoPlaying(true);
    } else {
      stopPlaying();
    }
  };
  // 確保清掉timer跟autoplay
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) {
        stopPlaying();
      }
    };
  }, []);

  const handleRandomChoose = (min: number, max: number) => {
    stopPlaying();
    const randomIndex = getRandomInt(min, max);
    if (curWordIndex <= randomIndex) {
      setSlideDirection("right");
      setIsCardFlip(false);
      setIsHintOpen(false);
      setTimeout(() => {
        setCurWordIndex(randomIndex);
      }, 100);
    } else if (curWordIndex > randomIndex) {
      setSlideDirection("left");
      setIsCardFlip(false);
      setIsHintOpen(false);
      setTimeout(() => {
        setCurWordIndex(randomIndex);
      }, 100);
    }
  };
  console.log("full word card re-render");

  return (
    <>
      <div className="relative flex max-h-[520px] min-h-[500px] max-w-full min-w-0 flex-grow flex-col perspective-[1000px]">
        {/* front content area */}
        <div
          className={`relative flex w-full flex-col gap-4 rounded-xl bg-white px-6 py-4 shadow-2xl ring ring-gray-300 transition-all duration-200 backface-hidden ${isCardFlip ? "rotate-x-[-180deg]" : ""} ${getSlideClasses()}`}
        >
          {/* 播放時不能對卡片點擊!所以要有overlay */}
          {isAutoPlaying && (
            <div className="absolute top-0 left-0 z-20 h-full w-full bg-transparent"></div>
          )}
          <div
            onClick={() => {
              setIsCardFlip((prev) => !prev);
              setIsHintOpen(false);
            }}
            className={`flex max-h-[420px] min-h-[360px] max-w-full min-w-0 flex-col gap-2 bg-white hover:cursor-pointer sm:min-h-[400px]`}
          >
            {/* header */}
            <div className="flex w-full items-center justify-between">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHintOpen((prev) => !prev);
                }}
                className={`${isHintOpen ? "bg-gray-200" : ""} flex gap-2 rounded-full px-2 py-1 font-bold hover:cursor-pointer`}
              >
                <BiBulb className="h-6 w-6" />
                <span className="text-md sm:text-lg">
                  {isHintOpen
                    ? words[curWordIndex].vocabulary[0] +
                      "_".repeat(words[curWordIndex].vocabulary.length - 1)
                    : "顯示提示"}
                </span>
              </div>
              <div className="flex gap-2 sm:gap-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    Speaker(
                      words[curWordIndex].definition,
                      words[curWordIndex].definitionSound,
                    );
                  }}
                  className="relative after:invisible after:absolute after:top-[120%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white after:content-['播放'] hover:cursor-pointer hover:after:visible"
                >
                  <HiOutlineSpeakerWave className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* definition */}
            <div className="break-word flex flex-grow items-center justify-center overflow-scroll text-center text-3xl text-black md:text-4xl lg:text-5xl">
              {words[curWordIndex].definition}
            </div>
          </div>
        </div>

        {/* back content area */}
        <div
          className={`absolute top-0 left-[50%] flex w-full min-w-0 flex-grow translate-x-[-50%] rotate-x-180 flex-col gap-4 rounded-xl bg-white px-6 py-4 shadow-2xl ring ring-gray-300 transition-all duration-200 backface-hidden ${isCardFlip ? "rotate-x-[0deg]" : ""} ${getSlideClasses()}`}
        >
          {isAutoPlaying && (
            <div className="absolute top-0 left-0 z-20 h-full w-full bg-transparent"></div>
          )}
          <div
            onClick={() => {
              setIsCardFlip((prev) => !prev);
              setIsHintOpen(false);
            }}
            className={`flex max-h-[420px] min-h-[360px] w-full min-w-0 flex-col gap-2 bg-white hover:cursor-pointer sm:min-h-[400px]`}
          >
            {/* header */}
            <div className="flex w-full items-center justify-between">
              <div></div> {/* 移除了提示之後要留著空的div確保排版 */}
              <div className="flex gap-2 sm:gap-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    Speaker(
                      words[curWordIndex].vocabulary,
                      words[curWordIndex].vocabularySound,
                    );
                  }}
                  className="relative after:invisible after:absolute after:top-[120%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white after:content-['撥放'] hover:cursor-pointer hover:after:visible"
                >
                  <HiOutlineSpeakerWave className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* vocabulary */}
            <div className="break-word flex flex-grow items-center justify-center overflow-scroll text-center text-3xl text-black md:text-4xl lg:text-5xl">
              {words[curWordIndex].vocabulary}
            </div>
          </div>
        </div>

        {/* 字卡control */}
        <div className="mt-2 flex h-[60px] w-full py-2 sm:flex-grow">
          <div className="flex flex-grow basis-4/10 items-center justify-end">
            <div
              onClick={() => {
                handlePrevCard();
                stopPlaying();
              }}
              className={`${curWordIndex === 0 ? "pointer-events-none text-gray-300" : "border-gray-200 hover:bg-gray-100"} flex h-12 w-16 items-center justify-center rounded-full border-2 hover:cursor-pointer`}
            >
              <FaArrowLeft className="h-6 w-6" />
            </div>
          </div>
          <div className="flex max-w-[100px] min-w-[90px] basis-2/10 items-center justify-center gap-4">
            <span className="text-[1.2rem] font-bold">
              {curWordIndex + 1} &nbsp; / &nbsp; {words.length}
            </span>
          </div>
          <div className="flex flex-grow basis-4/10 items-center justify-start">
            <div
              onClick={() => {
                handleNextCard();
                stopPlaying();
              }}
              className={`${curWordIndex === words.length - 1 ? "pointer-events-none text-gray-300" : "border-gray-200 hover:bg-gray-100"} flex h-12 w-16 items-center justify-center rounded-full border-2 hover:cursor-pointer`}
            >
              <FaArrowRight className="h-6 w-6" />
            </div>
            <div className="ml-auto hidden gap-2 sm:flex xl:gap-6">
              <div
                onClick={() => toggleAutoPlay()}
                className={`${isAutoPlaying ? "bg-gray-300 after:content-['暫停']" : "after:content-['播放']"} ${!isAutoPlaying && curWordIndex === words.length - 1 ? "pointer-events-none text-gray-300" : ""} relative flex h-10 w-10 items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
              >
                {isAutoPlaying ? (
                  <FaPause className="h-6 w-6 text-[var(--light-theme-color)]" />
                ) : (
                  <FaPlay className="h-5 w-5" />
                )}
              </div>
              <div
                onClick={() => {
                  handleFromStart();
                  stopPlaying();
                }}
                className={`${curWordIndex === 0 ? "pointer-events-none text-gray-300" : ""} relative flex h-10 w-10 items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['回到第一張'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
              >
                <FaBackwardStep className="h-6 w-6" />
              </div>
              <div
                onClick={() => handleRandomChoose(0, words.length - 1)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['隨機一張字卡'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible"
              >
                <LiaRandomSolid className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>
        <div className="ml-auto flex w-full items-center justify-center gap-2 sm:hidden xl:gap-6">
          <div
            onClick={() => toggleAutoPlay()}
            className={`${isAutoPlaying ? "bg-gray-300 after:content-['暫停']" : "after:content-['播放']"} ${!isAutoPlaying && curWordIndex === words.length - 1 ? "pointer-events-none text-gray-300" : ""} relative flex h-10 w-10 items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
          >
            {isAutoPlaying ? (
              <FaPause className="h-6 w-6 text-[var(--light-theme-color)]" />
            ) : (
              <FaPlay className="h-6 w-6" />
            )}
          </div>
          <div
            onClick={() => {
              handleFromStart();
              stopPlaying();
            }}
            className={`${curWordIndex === 0 ? "pointer-events-none text-gray-300" : ""} relative flex h-10 w-10 items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['回到第一張'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
          >
            <FaBackwardStep className="h-6 w-6" />
          </div>
          <div
            onClick={() => handleRandomChoose(0, words.length - 1)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['隨機一張字卡'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible"
          >
            <LiaRandomSolid className="h-6 w-6" />
          </div>
        </div>
      </div>
    </>
  );
};

export default FullWordCard;
