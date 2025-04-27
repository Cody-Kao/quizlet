import { useState, useEffect, useRef } from "react";
import { BiBulb } from "react-icons/bi";
import { GoPencil } from "react-icons/go";
import { HiOutlineSpeakerWave } from "react-icons/hi2";
import { FaStar, FaArrowLeft, FaArrowRight, FaPlay } from "react-icons/fa";
import { LiaRandomSolid } from "react-icons/lia";
import { RiFullscreenFill } from "react-icons/ri";
import { FaBackwardStep } from "react-icons/fa6";
import { FaPause } from "react-icons/fa6";
import { Word } from "../Types/types";
import { getRandomInt, AutoPlaySpeaker, Speaker } from "../Utils/utils";
import AddOrEditWordModal from "./AddOrEditWordModal";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { useNavigate } from "react-router";
import React from "react";

const BigWordCard = React.memo(
  ({
    wordSetID,
    words,
    authorID,
    handleStarOne,
    setWords,
  }: {
    wordSetID: string;
    words: Word[];
    authorID: string;
    handleStarOne: (id: string) => void;
    setWords: React.Dispatch<React.SetStateAction<Word[]>>;
  }) => {
    const { user } = useLogInContextProvider();
    const navigate = useNavigate();
    const [isCardFlip, setIsCardFlip] = useState(false);
    const [isHintOpen, setIsHintOpen] = useState(false);
    const [curWordIndex, setCurWordIndex] = useState(0);
    const [slideDirection, setSlideDirection] = useState<string | null>(null);
    const [isSliding, setIsSliding] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const autoPlayTimerRef = useRef<number | null>(null);
    const soundPlayTimerRef = useRef<number | null>(null);
    const [isEditWordModalOpen, setIsEditWordModalOpen] = useState(false);
    const speechRef = useRef<SpeechSynthesisUtterance | null>(null); // Store speech instance
    // sort words array by default(A-Z)
    if (words.length === 0) {
      return null;
    }
    const sortedWords: Word[] = [...words].sort((a, b) =>
      a.vocabulary.localeCompare(b.vocabulary, undefined, {
        sensitivity: "base",
      }),
    );

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
      if (curWordIndex < sortedWords.length - 1) {
        setSlideDirection("right");
        setIsCardFlip(false);
        setIsHintOpen(false);
        setTimeout(() => {
          setCurWordIndex((prev) => Math.min(sortedWords.length - 1, prev + 1));
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
            sortedWords[curWordIndexConst].vocabulary,
            sortedWords[curWordIndexConst].vocabularySound,
            speechRef,
          );
          // Flip to back side and show for 2 seconds
          setIsCardFlip(true);
          autoPlayTimerRef.current = setTimeout(() => {
            // Move to next card if not at the end
            handleNextCard();
            if (curWordIndexConst + 1 === sortedWords.length) {
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

      setIsAutoPlaying(false);
    };

    const toggleAutoPlay = () => {
      if (!isAutoPlaying) {
        // Start the auto-play sequence
        setIsAutoPlaying(true);
        startAutoPlaySequence(curWordIndex);
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
    console.log("big word re-render");

    return (
      <>
        <AddOrEditWordModal
          wordSetID={wordSetID}
          isModalOpen={isEditWordModalOpen}
          setIsModalOpen={setIsEditWordModalOpen}
          mode={false}
          starMode={false}
          curWord={sortedWords[curWordIndex]}
          setWords={setWords}
        />
        <div className="relative flex max-h-[620px] min-h-[500px] max-w-full min-w-0 flex-col perspective-[1000px]">
          {/* front content area */}
          <div
            className={`relative flex max-h-[360px] w-full flex-col gap-4 rounded-xl bg-white px-6 py-4 shadow-2xl ring ring-gray-300 transition-all duration-200 backface-hidden sm:max-h-full ${isCardFlip ? "rotate-x-[-180deg]" : ""} ${getSlideClasses()}`}
          >
            {/* 播放時不能對卡片點擊!所以要有overlay */}
            {isAutoPlaying && (
              <div className="absolute top-0 left-0 z-20 h-full w-full bg-transparent"></div>
            )}
            <div
              onClick={() => {
                console.log("hi from front");
                setIsCardFlip((prev) => !prev);
                setIsHintOpen(false);
              }}
              className={`flex max-h-[420px] min-h-[340px] max-w-full min-w-0 flex-col gap-2 bg-white hover:cursor-pointer sm:min-h-[400px]`}
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
                      ? sortedWords[curWordIndex].vocabulary[0] +
                        "_".repeat(
                          sortedWords[curWordIndex].vocabulary.length - 1,
                        )
                      : "顯示提示"}
                  </span>
                </div>
                <div className="flex gap-2 sm:gap-4">
                  {user !== null && user.id === authorID && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditWordModalOpen(true);
                      }}
                      className="relative after:invisible after:absolute after:top-[120%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white after:content-['編輯'] hover:cursor-pointer hover:after:visible"
                    >
                      <GoPencil className="h-6 w-6" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      Speaker(
                        sortedWords[curWordIndex].definition,
                        sortedWords[curWordIndex].definitionSound,
                      );
                    }}
                    className="relative after:invisible after:absolute after:top-[120%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white after:content-['播放'] hover:cursor-pointer hover:after:visible"
                  >
                    <HiOutlineSpeakerWave className="h-6 w-6" />
                  </button>
                  {user !== null && user.id === authorID && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStarOne(sortedWords[curWordIndex].id);
                      }}
                      className="relative after:invisible after:absolute after:top-[120%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white after:content-['加入最愛'] hover:cursor-pointer hover:after:visible"
                    >
                      <FaStar
                        className={`${sortedWords[curWordIndex].star ? "text-amber-300" : ""} h-6 w-6`}
                      />
                    </button>
                  )}
                </div>
              </div>

              {/* definition */}
              <div className="break-word flex flex-grow items-center justify-center overflow-scroll text-center text-2xl text-black md:text-4xl lg:text-5xl">
                {sortedWords[curWordIndex].definition}
              </div>
            </div>
          </div>

          {/* back content area */}
          <div
            className={`absolute top-0 left-[50%] flex max-h-[360px] w-full min-w-0 flex-grow translate-x-[-50%] rotate-x-180 flex-col gap-4 rounded-xl bg-white px-6 py-4 shadow-2xl ring ring-gray-300 transition-all duration-200 backface-hidden sm:max-h-full ${isCardFlip ? "rotate-x-[0deg]" : ""} ${getSlideClasses()}`}
          >
            {/* 播放時不能對卡片點擊!所以要有overlay */}
            {isAutoPlaying && (
              <div className="absolute top-0 left-0 z-20 h-full w-full bg-transparent"></div>
            )}
            <div
              onClick={() => {
                console.log("hi from back");
                setIsCardFlip((prev) => !prev);
                setIsHintOpen(false);
              }}
              className={`flex max-h-[420px] min-h-[340px] w-full min-w-0 flex-col gap-2 bg-white hover:cursor-pointer sm:min-h-[400px]`}
            >
              {/* header */}
              <div className="flex w-full items-center justify-between">
                <div></div> {/* 移除了提示之後要留著空的div確保排版 */}
                <div className="flex gap-2 sm:gap-4">
                  {user !== null && user.id === authorID && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditWordModalOpen(true);
                      }}
                      className="relative after:invisible after:absolute after:top-[120%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white after:content-['編輯'] hover:cursor-pointer hover:after:visible"
                    >
                      <GoPencil className="h-6 w-6" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      Speaker(
                        sortedWords[curWordIndex].vocabulary,
                        sortedWords[curWordIndex].vocabularySound,
                      );
                    }}
                    className="relative after:invisible after:absolute after:top-[120%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white after:content-['撥放'] hover:cursor-pointer hover:after:visible"
                  >
                    <HiOutlineSpeakerWave className="h-6 w-6" />
                  </button>
                  {user !== null && user.id === authorID && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStarOne(sortedWords[curWordIndex].id);
                      }}
                      className="relative after:invisible after:absolute after:top-[120%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white after:content-['加入最愛'] hover:cursor-pointer hover:after:visible"
                    >
                      <FaStar
                        className={`${sortedWords[curWordIndex].star ? "text-amber-300" : ""} h-6 w-6`}
                      />
                    </button>
                  )}
                </div>
              </div>

              {/* vocabulary */}
              <div className="break-word flex flex-grow items-center justify-center overflow-scroll text-center text-3xl text-black md:text-4xl lg:text-5xl">
                {sortedWords[curWordIndex].vocabulary}
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
                {curWordIndex + 1} &nbsp; / &nbsp; {sortedWords.length}
              </span>
            </div>
            <div className="flex flex-grow basis-4/10 items-center justify-start">
              <div
                onClick={() => {
                  handleNextCard();
                  stopPlaying();
                }}
                className={`${curWordIndex === sortedWords.length - 1 ? "pointer-events-none text-gray-300" : "border-gray-200 hover:bg-gray-100"} flex h-12 w-16 items-center justify-center rounded-full border-2 hover:cursor-pointer`}
              >
                <FaArrowRight className="h-6 w-6" />
              </div>
              <div className="ml-auto hidden gap-2 md:flex xl:gap-6">
                <div
                  onClick={() => toggleAutoPlay()}
                  className={`${isAutoPlaying ? "bg-gray-300 after:content-['暫停']" : "after:content-['播放']"} ${!isAutoPlaying && curWordIndex === sortedWords.length - 1 ? "pointer-events-none text-gray-300" : ""} relative flex h-10 w-10 items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
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
                  onClick={() => handleRandomChoose(0, sortedWords.length - 1)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['隨機一張字卡'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible"
                >
                  <LiaRandomSolid className="h-6 w-6" />
                </div>
                <div
                  onClick={() => {
                    stopPlaying();
                    navigate(`/game/${wordSetID}/wordCard`, {
                      replace: false,
                    });
                  }}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['全螢幕'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible"
                >
                  <RiFullscreenFill className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
          {/* 小螢幕時把其餘操控鍵放下來 */}
          <div className="mt-[.5rem] ml-auto flex w-full items-center justify-center gap-10 md:hidden xl:gap-6">
            <div
              onClick={() => toggleAutoPlay()}
              className={`${isAutoPlaying ? "bg-gray-300 after:content-['暫停']" : "after:content-['播放']"} ${!isAutoPlaying && curWordIndex === sortedWords.length - 1 ? "pointer-events-none text-gray-300" : ""} relative flex h-max w-10 flex-col items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
            >
              {isAutoPlaying ? (
                <>
                  <FaPause className="h-5 w-5 text-[var(--light-theme-color)]" />
                  <span className="w-max text-[.8rem]">暫停</span>
                </>
              ) : (
                <>
                  <FaPlay className="h-5 w-5" />
                  <span className="w-max text-[.8rem]">播放</span>
                </>
              )}
            </div>
            <div
              onClick={() => {
                handleFromStart();
                stopPlaying();
              }}
              className={`${curWordIndex === 0 ? "pointer-events-none text-gray-300" : ""} relative flex h-max w-10 flex-col items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['回到第一張'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
            >
              <FaBackwardStep className="h-6 w-6" />
              <span className="w-max text-[.8rem]">回到第一張</span>
            </div>
            <div
              onClick={() => handleRandomChoose(0, sortedWords.length - 1)}
              className="relative flex h-max w-10 flex-col items-center justify-center rounded-full after:invisible after:absolute after:top-[110%] after:left-[50%] after:min-w-max after:translate-x-[-50%] after:rounded-lg after:bg-black after:px-2 after:py-1 after:text-[.8rem] after:font-bold after:text-white after:content-['隨機一張字卡'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible"
            >
              <LiaRandomSolid className="h-6 w-6" />
              <span className="w-max text-[.8rem]">隨機一張</span>
            </div>
          </div>
        </div>
      </>
    );
  },
);

export default BigWordCard;
