import { FaRegStar, FaStar } from "react-icons/fa";
import { FiShare } from "react-icons/fi";
import { HiDotsHorizontal } from "react-icons/hi";
import { GoPencil } from "react-icons/go";
import { FaRegCopy } from "react-icons/fa6";
import { HiOutlineTrash } from "react-icons/hi2";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { BsCardText } from "react-icons/bs";
import { IoMdCheckboxOutline } from "react-icons/io";
import { PiNotePencilBold } from "react-icons/pi";
import { HiOutlineSpeakerWave } from "react-icons/hi2";
import { IoAddCircleOutline } from "react-icons/io5";
import UserLink from "./UserLink";
import { NoticeDisplay, sortWordType, Word, WordSetType } from "../Types/types";
import {
  AddRecentVisitRequest,
  DeleteWordSetRequest,
  ForkWordSetRequest,
  InlineUpdateWordRequest,
  ToggleAllWordStarRequest,
  ToggleLikeWordSetRequest,
  ToggleWordStarRequest,
} from "../Types/request";
import BigWordCard from "./BigWordCard";
import AddOrEditWordModal from "./AddOrEditWordModal";
import { formatTime, Speaker } from "../Utils/utils";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { postRequest } from "../Utils/postRequest";
import { PATH } from "../Consts/consts";
import ConfirmModal from "./ConfirmModal";
import { useNavigate } from "react-router";
import ContentEditable from "./ContentEditable";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";

export default function WordSet({ wordSet }: { wordSet: WordSetType }) {
  const authorID = wordSet.authorID;
  const { user } = useLogInContextProvider();
  const { setNotice } = useNoticeDisplayContextProvider();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toolKitRef = useRef<HTMLDivElement | null>(null);
  const [sortType, setSortType] = useState<sortWordType>("1");
  const [displayAllWords, setDisplayAllWords] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [likes, setLikes] = useState<boolean>(
    () => wordSet.likedUsers?.includes(user?.id ?? "") ?? false,
  );
  const [wordSetLikes, setWordSetLikes] = useState<number>(() => wordSet.likes);
  const [forkLoading, setForkLoading] = useState<boolean>(false);
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        toolKitRef.current &&
        !toolKitRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const [words, setWords] = useState<Word[]>(() => {
    // 若後端說要交換vocabulary跟definition 就要交換
    if (wordSet.shouldSwap) {
      return wordSet.words.map((word) => ({
        ...word,
        vocabulary: word.definition,
        definition: word.vocabulary,
        vocabularySound: word.definitionSound,
        definitionSound: word.vocabularySound,
      }));
    } else {
      return wordSet.words;
    }
  });

  // 全選星星
  const handleStarAll = () => {
    const currentState = sortedWords.length === sortedStarWords.length;
    if (!currentState) {
      postRequest(`${PATH}/toggleAllWordStar`, {
        wordSetID: wordSet.id,
        newStar: true,
      } as ToggleAllWordStarRequest)
        .then(() => {
          setWords((prev) => prev.map((word) => ({ ...word, star: true })));
        })
        .catch((error) => {
          setNotice(error as NoticeDisplay);
        });
    } else {
      postRequest(`${PATH}/toggleAllWordStar`, {
        wordSetID: wordSet.id,
        newStar: false,
      } as ToggleAllWordStarRequest)
        .then(() => {
          setWords((prev) => prev.map((word) => ({ ...word, star: false })));
        })
        .catch((error) => {
          setNotice(error as NoticeDisplay);
        });
    }
  };

  // 單選星星
  const handleStarOne = useCallback((id: string) => {
    postRequest(`${PATH}/toggleWordStar`, {
      wordSetID: wordSet.id,
      wordID: id,
    } as ToggleWordStarRequest)
      .then(() => {
        setWords((prev) =>
          prev.map((word) =>
            word.id === id ? { ...word, star: !word.star } : word,
          ),
        );
      })
      .catch((error) => {
        setNotice(error as NoticeDisplay);
      });
  }, []);

  // 按字母順序(A-Z)且不管大小寫，並用useMemo減少re-render開銷
  const sortedWords = useMemo(() => {
    switch (sortType) {
      case "1":
        return [...words].sort((a, b) => a.order - b.order); // order從小到大

      case "2":
        return [...words].sort((a, b) =>
          a.vocabulary.localeCompare(b.vocabulary, undefined, {
            sensitivity: "base",
          }),
        );
      case "3":
        return [...words].sort((a, b) =>
          b.vocabulary.localeCompare(a.vocabulary, undefined, {
            sensitivity: "base",
          }),
        );
      default:
        return [...words].sort((a, b) => a.order - b.order); // order從小到大
    }
  }, [words, sortType]);
  // 選出星號單字
  const sortedStarWords = sortedWords.filter((word) => word.star === true);

  // inline編輯單字
  const [editWordID, setEditWordID] = useState<string>("");
  const [editVocabulary, setEditVocabulary] = useState<string>("");
  const [editDefinition, setEditDefinition] = useState<string>("");

  // 字數長度error
  const [editVocabularyError, setEditVocabularyError] = useState<string>("");
  const [editDefinitionError, setEditDefinitionError] = useState<string>("");

  const handleEdit = (
    wordID: string,
    vocabulary: string,
    definition: string,
  ) => {
    const newVocabulary = vocabulary.trim();
    const newDefinition = definition.trim();
    if (newVocabulary.trim() === "") {
      setEditVocabularyError("單字不得為空");
      return;
    } else if (newVocabulary.length > 100) {
      setEditVocabularyError("單字不得超過100個字");
      return;
    } else {
      setEditVocabularyError("");
    }
    if (newDefinition.trim() === "") {
      setEditDefinitionError("註釋不得為空");
      return;
    } else if (newDefinition.length > 300) {
      setEditDefinitionError("註釋不得超過300個字");
      return;
    } else {
      setEditDefinitionError("");
    }

    postRequest(`${PATH}/inlineUpdateWord`, {
      wordSetID: wordSet.id,
      wordID: wordID,
      newVocabulary: newVocabulary,
      newDefinition: newDefinition,
    } as InlineUpdateWordRequest)
      .then(() => {
        setWords((preWords) =>
          preWords.map((word) =>
            word.id === wordID
              ? {
                  ...word,
                  vocabulary: newVocabulary,
                  definition: newDefinition,
                }
              : word,
          ),
        );
        setNotice({
          type: "Success",
          payload: { message: "單字編輯成功" },
        } as NoticeDisplay);
      })
      .catch((error) => {
        setNotice(error as NoticeDisplay);
      })
      .finally(() => {
        setEditWordID("");
      });
  };
  // Handle clicking outside to discard edits
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editWordID) {
        const contentDiv = document.getElementById(`${editWordID}`);
        if (contentDiv && !contentDiv.contains(event.target as Node)) {
          setEditWordID(""); // Discard edits
          setEditDefinition("");
          setEditVocabulary("");
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editWordID]);

  useEffect(() => {
    if (user === null) return;

    postRequest(`${PATH}/addRecentVisit`, {
      userID: user.id,
      wordSetID: wordSet.id,
    } as AddRecentVisitRequest);
  }, [user]);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const [isDeletingLoading, setIsDeletingLoading] = useState<boolean>(false);

  const handleDelete = useCallback(() => {
    let isMounted = true; // Track component mount state

    setIsDeletingLoading(true);

    postRequest(`${PATH}/deleteWordSet`, {
      wordSetID: wordSet.id,
    } as DeleteWordSetRequest)
      .then(() => {
        if (!isMounted) return; // Prevent state updates if unmounted
        setNotice({
          type: "Success",
          payload: { message: "刪除單字集成功" },
        } as NoticeDisplay);

        if (user === null) {
          navigate("/");
        } else {
          navigate(`/lib/${user.id}`);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        setNotice(error as NoticeDisplay);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsDeletingLoading(false);
      });

    return () => {
      isMounted = false; // Cleanup function to prevent updates
    };
  }, [user, wordSet.id]);

  const handleCopyURL = () => {
    const currentUrl = window.location.href;
    navigator.clipboard
      .writeText(currentUrl)
      .then(() => {
        setNotice({ type: "Success", payload: { message: "複製連結成功" } });
      })
      .catch(() => {
        setNotice({ type: "Error", payload: { message: "複製連結失敗" } });
      })
      .finally(() => {
        setIsMenuOpen(false);
      });
  };

  return (
    <>
      <ConfirmModal
        description="確定刪除? 此項操作不得復原"
        isModalOpen={isConfirmModalOpen}
        setIsModalOpen={setIsConfirmModalOpen}
        callback={() => {
          handleDelete();
        }}
      />
      <AddOrEditWordModal
        wordSetID={wordSet.id}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        mode={true}
        starMode={!displayAllWords}
        setWords={setWords}
        order={
          words.sort((a, b) => a.order - b.order)[words.length - 1].order + 1
        } // order比最後一位大就好
      />
      <div className="flex h-full w-full flex-col items-center px-[2rem] py-[1rem] sm:py-[2rem] lg:items-start lg:px-[6rem] xl:px-[8rem]">
        <div className="flex h-full w-full flex-col md:max-w-[90%] md:min-w-[80%] xl:max-w-[85%]">
          {/* header */}
          <div className="flex w-full flex-col flex-wrap items-center font-bold sm:flex-row">
            <h1
              title={wordSet.title}
              className="pb-[1rem] text-center text-2xl font-bold break-words text-black sm:max-w-[60%] sm:pb-0 sm:text-left sm:text-2xl lg:text-[1.5rem] xl:text-2xl"
            >
              {wordSet.title}
            </h1>
            <div className="flex items-center gap-3 sm:ml-auto">
              <div className="mr-auto text-center text-[.8rem] sm:mr-0 md:text-[1rem]">
                <span>上次修改:</span>
                <span>{formatTime(wordSet.updatedAt)}</span>
              </div>
              {user !== null && user.id !== authorID && (
                <div
                  onClick={() => {
                    postRequest(`${PATH}/toggleLikeWordSet`, {
                      userID: user.id,
                      wordSetID: wordSet.id,
                    } as ToggleLikeWordSetRequest)
                      .then(() => {
                        if (likes) {
                          setWordSetLikes((prev) => prev - 1);
                        } else {
                          setWordSetLikes((prev) => prev + 1);
                        }
                        setLikes((prev) => !prev);
                      })
                      .catch((error) => {
                        setNotice(error as NoticeDisplay);
                      });
                  }}
                  className={`${likes ? "text-amber-300" : ""} relative flex items-center rounded-lg border-2 border-gray-300 p-2 text-[.8rem] after:invisible after:absolute after:bottom-[-45px] after:left-[50%] after:z-10 after:flex after:h-[36px] after:w-max after:translate-x-[-50%] after:items-center after:justify-center after:rounded-lg after:bg-black after:px-[5px] after:font-bold after:text-white after:content-['儲存'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
                >
                  <FaStar className="h-[1.2rem] w-[1.2rem]" />
                  <span>{wordSetLikes}</span>
                </div>
              )}
              <div
                onClick={() => {
                  setForkLoading(true);
                  postRequest(`${PATH}/forkWordSet`, {
                    userID: user?.id ?? "",
                    wordSetID: wordSet.id,
                  } as ForkWordSetRequest)
                    .then(() => {
                      setNotice({
                        type: "Success",
                        payload: { message: "成功加入自創單字集" },
                      } as NoticeDisplay);
                    })
                    .catch((error) => {
                      setNotice(error as NoticeDisplay);
                    })
                    .finally(() => {
                      setForkLoading(false);
                    });
                }}
                className={`${wordSet.allowCopy === false ? "pointer-events-none bg-gray-100 text-gray-300" : ""} ${forkLoading ? "pointer-events-none bg-gray-100 text-gray-300" : ""} relative flex items-center rounded-lg border-2 border-gray-300 p-2 text-[.8rem] after:invisible after:absolute after:bottom-[-45px] after:left-[50%] after:z-10 after:flex after:h-[36px] after:w-max after:translate-x-[-50%] after:items-center after:justify-center after:rounded-lg after:bg-black after:px-[5px] after:font-bold after:text-white after:content-['複製並自訂此學習集'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible`}
              >
                <FaRegCopy className={`h-[1.2rem] w-[1.2rem]`} />
              </div>
              {/* 更多 Menu */}
              <div className="relative" ref={toolKitRef}>
                {/* Menu Toggle Button */}
                <div
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent click from closing itself
                    setIsMenuOpen((prev) => !prev);
                  }}
                  className="relative flex items-center rounded-lg border-2 border-gray-300 p-2 text-[.8rem] after:invisible after:absolute after:bottom-[-45px] after:left-[50%] after:z-10 after:flex after:h-[36px] after:w-max after:translate-x-[-50%] after:items-center after:justify-center after:rounded-lg after:bg-black after:px-[5px] after:font-bold after:text-white after:content-['更多'] hover:cursor-pointer hover:bg-gray-300 hover:after:visible"
                >
                  <HiDotsHorizontal className="h-[1.2rem] w-[1.2rem]" />
                </div>

                {/* Menu Content */}
                {isMenuOpen && (
                  <div className="absolute top-[120%] right-0 z-20 flex w-max flex-col items-center bg-gray-300">
                    {user !== null && user.id === authorID && (
                      <>
                        <div
                          onClick={() => navigate(`/editWordSet/${wordSet.id}`)}
                          className="flex h-full w-full flex-grow items-center gap-2 p-2 hover:cursor-pointer hover:bg-gray-400"
                        >
                          <GoPencil className="h-[1.5rem] w-[1.5rem]" />
                          <span>編輯</span>
                        </div>
                        <div
                          onClick={() => setIsConfirmModalOpen(true)}
                          className={`${isDeletingLoading ? "pointer-events-none bg-gray-200 text-gray-400" : ""} flex h-full w-full flex-grow items-center gap-2 p-2 hover:cursor-pointer hover:bg-gray-400`}
                        >
                          <HiOutlineTrash className="h-[1.5rem] w-[1.5rem]" />
                          <span>刪除</span>
                        </div>
                      </>
                    )}
                    <div
                      onClick={() => handleCopyURL()}
                      className={`flex h-full w-full flex-grow items-center gap-2 p-2 hover:cursor-pointer hover:bg-gray-400`}
                    >
                      <FiShare className={`h-[1.5rem] w-[1.5rem]`} />
                      <span>分享</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 測驗選單區 */}
          <div className="mt-8 mb-8 flex h-[100px] w-full flex-wrap gap-4">
            <div
              onClick={() =>
                navigate(`/game/${wordSet.id}/wordCard`, {
                  replace: false,
                })
              }
              className="relative flex h-[50px] min-w-[110px] flex-grow items-center justify-center gap-2 overflow-hidden rounded-lg bg-gray-100 p-2 text-[var(--light-theme-opacity-color)] after:invisible after:absolute after:bottom-0 after:h-[5px] after:w-full after:bg-[var(--light-theme-color)] after:opacity-[.5] after:content-[''] hover:cursor-pointer hover:after:visible sm:h-[60px]"
            >
              <BsCardText className="h-[1.5rem] w-[1.5rem] md:h-[2rem] md:w-[2rem]" />
              <span className="text-md font-bold sm:text-xl">單字卡</span>
            </div>
            <div
              onClick={() =>
                navigate(`/game/${wordSet.id}/multiChoice`, {
                  replace: false,
                })
              }
              className="relative flex h-[50px] min-w-[110px] flex-grow items-center justify-center gap-2 overflow-hidden rounded-lg bg-gray-100 p-2 text-[var(--light-theme-opacity-color)] after:invisible after:absolute after:bottom-0 after:h-[5px] after:w-full after:bg-[var(--light-theme-color)] after:opacity-[.5] after:content-[''] hover:cursor-pointer hover:after:visible sm:h-[60px]"
            >
              <IoMdCheckboxOutline className="h-[1.5rem] w-[1.5rem] md:h-[2rem] md:w-[2rem]" />
              <span className="text-md font-bold sm:text-xl">選擇題</span>
            </div>
            <div
              onClick={() =>
                navigate(`/game/${wordSet.id}/cloze`, {
                  replace: false,
                })
              }
              className="relative flex h-[50px] min-w-[110px] flex-grow items-center justify-center gap-2 overflow-hidden rounded-lg bg-gray-100 p-2 text-[var(--light-theme-opacity-color)] after:invisible after:absolute after:bottom-0 after:h-[5px] after:w-full after:bg-[var(--light-theme-color)] after:opacity-[.5] after:content-[''] hover:cursor-pointer hover:after:visible sm:h-[60px]"
            >
              <PiNotePencilBold className="h-[1.5rem] w-[1.5rem] md:h-[2rem] md:w-[2rem]" />
              <span className="text-md font-bold sm:text-xl">填充題</span>
            </div>
          </div>

          {/* 大字卡 */}
          <BigWordCard
            wordSetID={wordSet.id}
            words={words}
            authorID={authorID}
            handleStarOne={handleStarOne}
            setWords={setWords}
          />
          {/* 字卡作者與日期 */}
          <div className="flex h-[80px] w-full flex-wrap items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="relative font-bold after:absolute after:top-[50%] after:right-[-10%] after:h-[25px] after:w-[2px] after:translate-y-[-50%] after:bg-black after:content-[''] sm:text-[1.2rem]">
                建立者
              </span>
              <UserLink userID={wordSet.authorID} />
            </div>
            <div>
              <span>於</span> <span>{wordSet.createdAt}</span>
            </div>
          </div>

          {/* 單字集敘述 */}
          <div className="w-full text-[1.1rem] text-black">
            {wordSet.description}
          </div>

          {/* 單字列表outer div */}
          <div className="mt-10 w-full">
            {/* header */}
            <div className="flex items-center">
              <h2 className="font-bold text-black sm:text-[1.5rem]">
                本學習集中的詞語&nbsp;({words.length})
              </h2>
              <div className="ml-auto flex h-[30px] min-w-max items-center justify-center gap-4 border-b-2 border-gray-300 text-black">
                <span
                  className={`relative text-[.8rem] font-bold after:absolute after:top-[120%] after:left-[50%] after:h-[2px] after:w-full after:translate-x-[-50%] sm:text-[1rem] sm:after:top-[105%] ${displayAllWords ? "after:bg-[var(--light-theme-color)]" : ""} after:content-[''] hover:cursor-pointer`}
                  onClick={() => setDisplayAllWords(true)}
                >
                  全部
                </span>
                <span
                  className={`${sortedStarWords.length === 0 ? "pointer-events-none opacity-50 grayscale" : ""} relative text-[.8rem] font-bold after:absolute after:top-[120%] after:left-[50%] after:h-[2px] after:w-full after:translate-x-[-50%] sm:text-[1rem] sm:after:top-[105%] ${displayAllWords ? "" : "after:bg-[var(--light-theme-color)]"} after:content-[''] hover:cursor-pointer`}
                  onClick={() => setDisplayAllWords(false)}
                >
                  星號詞語({sortedStarWords.length})
                </span>
              </div>
            </div>
            <div className="flex w-full justify-end pt-2">
              <select
                value={sortType}
                onChange={(e) => setSortType(e.target.value as sortWordType)}
                className="rounded-md border border-gray-300 bg-white p-1 text-[.8rem] text-black hover:cursor-pointer sm:p-2 sm:text-[1rem]"
              >
                <option value="1">按原本順序</option>
                <option value="2">單字由小到大</option>
                <option value="3">單字由大到小</option>
              </select>
            </div>
            {/* 灰色區域 */}
            <div className="relative mt-4 flex w-full flex-col gap-4 rounded-xl bg-gray-100 p-4">
              {/* header */}
              {sortedWords.length > 0 &&
                user !== null &&
                user.id === authorID && (
                  <div className="mb-4 flex w-full items-center justify-between">
                    <div
                      onClick={() => navigate(`/editWordSet/${wordSet.id}`)}
                      className="flex gap-2 rounded-xl border-2 border-gray-400 px-4 py-2 hover:cursor-pointer hover:border-[var(--light-theme-color)] hover:text-[var(--light-theme-color)]"
                    >
                      <GoPencil className="h-6 w-6" />
                      <span>編輯單字集</span>
                    </div>

                    <div
                      onClick={() => handleStarAll()}
                      className={`${displayAllWords ? "" : "invisible"} ml-auto text-black hover:border-[var(--light-theme-color)] hover:text-[var(--light-theme-color)] ${sortedWords.length === sortedStarWords.length ? "border-[var(--light-theme-color)] text-[var(--light-theme-color)]" : "border-gray-400"} flex max-w-max flex-2 items-center justify-center gap-2 rounded-xl border-2 p-2 hover:cursor-pointer`}
                    >
                      {sortedWords.length === sortedStarWords.length ? (
                        <>
                          <FaStar className="text-xl text-amber-300" />
                          <span>全不選</span>
                        </>
                      ) : (
                        <>
                          <FaRegStar className="text-xl" />
                          <span>全選</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              {/* word display 白色區塊 */}
              {displayAllWords
                ? sortedWords.map((word, index) => (
                    <div
                      id={word.id}
                      key={index}
                      className="flex min-h-[100px] w-full flex-col items-center rounded-lg bg-white p-4 md:flex-row"
                    >
                      {/* Color bars container - giving it explicit height/width for both modes */}
                      <div className="flex h-auto min-h-20 w-full flex-col gap-4 md:w-5/6 md:flex-row xl:min-h-22">
                        <div className="relative flex h-auto min-h-2/5 w-full items-center px-4 break-words after:absolute after:right-0 after:h-[60%] after:w-[2px] after:bg-gray-100 after:content-[''] md:min-h-full md:w-3/7">
                          {editWordID === word.id ? (
                            <div className="overflow-wrap break-word relative flex w-full resize-none flex-col gap-2 break-words break-all">
                              <ContentEditable
                                content={editVocabulary}
                                updateContent={(newContent: string) => {
                                  if (newContent.length <= 100) {
                                    setEditVocabularyError("");
                                  }
                                  setEditVocabulary(newContent);
                                }}
                                className="w-full resize-none border-b-[3px] border-black break-words text-black outline-none focus:border-amber-300"
                              />
                              {/* <textarea
                                name="word edit"
                                value={editVocabulary}
                                onChange={(e) => {
                                  const text = e.target.value;
                                  if (text.length > 100) return;
                                  setEditVocabulary(e.target.value);
                                  setEditVocabularyError("");
                                }}
                                className="w-full resize-none border-b-[3px] border-black break-words text-black outline-none focus:border-amber-300"
                              ></textarea> */}
                              {editVocabularyError === "" ? (
                                <span className="text-[.8rem]">
                                  字數&nbsp;{editVocabulary.length}/100
                                </span>
                              ) : (
                                <span className="text-[.8rem] text-red-500">
                                  {editVocabularyError}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="overflow-wrap break-word resize-none break-words break-all text-black">
                              {word.vocabulary}
                            </span>
                          )}
                        </div>
                        <div className="flex h-auto min-h-3/5 w-full items-center px-4 text-[1.2rem] break-words text-black md:w-4/7">
                          {editWordID === word.id ? (
                            <div className="overflow-wrap break-word relative flex w-full resize-none flex-col gap-2 break-words break-all">
                              <ContentEditable
                                content={editDefinition}
                                updateContent={(newContent: string) => {
                                  if (newContent.length <= 100) {
                                    setEditDefinitionError("");
                                  }
                                  setEditDefinition(newContent);
                                }}
                                className="w-full resize-none border-b-[3px] border-black break-words text-black outline-none focus:border-amber-300"
                              />
                              {/* <textarea
                                name="definition edit"
                                value={editDefinition}
                                onChange={(e) => {
                                  const text = e.target.value;
                                  if (text.length > 300) return;
                                  setEditDefinition(e.target.value);
                                  setEditDefinitionError("");
                                }}
                                className="w-full resize-none border-b-[3px] border-black break-words text-black outline-none focus:border-amber-300"
                              ></textarea> */}
                              {editDefinitionError === "" ? (
                                <span className="text-[.8rem]">
                                  字數&nbsp;{editDefinition.length}/300
                                </span>
                              ) : (
                                <span className="text-[.8rem] text-red-500">
                                  {editDefinitionError}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="overflow-wrap break-word resize-none break-words break-all text-black">
                              {word.definition}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Button container - explicit dimensions for both modes */}
                      <div className="order-first flex h-max w-full justify-end gap-3 md:order-last md:h-20 md:w-1/6 md:justify-evenly md:gap-2 lg:gap-3">
                        {user !== null && user.id === authorID && (
                          <button
                            onClick={() => {
                              if (editWordID === word.id) {
                                if (
                                  editVocabulary === word.vocabulary &&
                                  editDefinition === word.definition
                                ) {
                                  setEditWordID("");
                                  return;
                                }
                                handleEdit(
                                  word.id,
                                  editVocabulary,
                                  editDefinition,
                                );
                              } else {
                                setEditWordID(word.id);
                                setEditVocabulary(word.vocabulary);
                                setEditDefinition(word.definition);
                                setEditVocabularyError("");
                                setEditDefinitionError("");
                              }
                            }}
                            className={`${editWordID === word.id ? "after:content-['儲存']" : "after:content-['編輯']"} relative after:invisible after:absolute after:top-[80%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white hover:cursor-pointer hover:after:visible`}
                          >
                            <GoPencil
                              className={`${editWordID === word.id ? "text-amber-300" : "*:"} h-6 w-6 md:h-5 md:w-5 lg:h-6 lg:w-6`}
                            />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            Speaker(word.vocabulary, word.vocabularySound);
                            Speaker(word.definition, word.definitionSound);
                          }}
                          className="relative after:invisible after:absolute after:top-[80%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white after:content-['播放'] hover:cursor-pointer hover:after:visible"
                        >
                          <HiOutlineSpeakerWave className="h-6 w-6 md:h-5 md:w-5 lg:h-6 lg:w-6" />
                        </button>
                        {user !== null && user.id === authorID && (
                          <button
                            onClick={() => handleStarOne(word.id)}
                            className="relative after:invisible after:absolute after:top-[80%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white after:content-['加入最愛'] hover:cursor-pointer hover:after:visible"
                          >
                            <FaStar
                              className={`${word.star ? "text-amber-300" : ""} h-6 w-6 md:h-5 md:w-5 lg:h-6 lg:w-6`}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                : sortedStarWords.map((word, index) => (
                    <div
                      id={word.id}
                      key={index}
                      className="flex min-h-[100px] w-full flex-col items-center rounded-lg bg-white p-4 md:flex-row"
                    >
                      {/* Color bars container - giving it explicit height/width for both modes */}
                      <div className="flex h-auto min-h-35 w-full flex-col gap-4 md:min-h-20 md:w-5/6 md:flex-row">
                        <div className="relative flex h-auto min-h-2/5 w-full items-center px-4 break-words after:absolute after:right-0 after:h-[60%] after:w-[2px] after:bg-gray-100 after:content-[''] md:min-h-full md:w-3/7">
                          {editWordID === word.id ? (
                            <div className="overflow-wrap break-word relative flex w-full resize-none flex-col gap-2 break-words break-all">
                              <ContentEditable
                                content={editVocabulary}
                                updateContent={(newContent: string) => {
                                  if (newContent.length <= 100) {
                                    setEditVocabularyError("");
                                  }
                                  setEditVocabulary(newContent);
                                }}
                                className="w-full resize-none border-b-[3px] border-black break-words text-black outline-none focus:border-amber-300"
                              />
                              {/* <textarea
                                name="word edit"
                                value={editVocabulary}
                                onChange={(e) => {
                                  const text = e.target.value;
                                  if (text.length > 100) return;
                                  setEditVocabulary(e.target.value);
                                  setEditVocabularyError("");
                                }}
                                className="w-full resize-none border-b-[3px] border-black break-words text-black outline-none focus:border-amber-300"
                              ></textarea> */}
                              {editVocabularyError === "" ? (
                                <span className="text-[.8rem]">
                                  字數&nbsp;{editVocabulary.length}/100
                                </span>
                              ) : (
                                <span className="text-[.8rem] text-red-500">
                                  {editVocabularyError}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="overflow-wrap break-word resize-none break-words break-all text-black">
                              {word.vocabulary}
                            </span>
                          )}
                        </div>
                        <div className="flex h-auto min-h-4/7 w-full items-center px-4 text-[1.2rem] break-words text-black md:w-3/5">
                          {editWordID === word.id ? (
                            <div className="overflow-wrap break-word relative flex w-full resize-none flex-col gap-2 break-words break-all">
                              <ContentEditable
                                content={editDefinition}
                                updateContent={(newContent: string) => {
                                  if (newContent.length <= 100) {
                                    setEditDefinitionError("");
                                  }
                                  setEditDefinition(newContent);
                                }}
                                className="w-full resize-none border-b-[3px] border-black break-words text-black outline-none focus:border-amber-300"
                              />
                              {/* <textarea
                                name="definition edit"
                                value={editDefinition}
                                onChange={(e) => {
                                  const text = e.target.value;
                                  if (text.length > 300) return;
                                  setEditDefinition(e.target.value);
                                  setEditDefinitionError("");
                                }}
                                className="w-full resize-none border-b-[3px] border-black break-words text-black outline-none focus:border-amber-300"
                              ></textarea> */}
                              {editDefinitionError === "" ? (
                                <span className="text-[.8rem]">
                                  字數&nbsp;{editDefinition.length}/300
                                </span>
                              ) : (
                                <span className="text-[.8rem] text-red-500">
                                  {editDefinitionError}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="overflow-wrap break-word resize-none break-words break-all text-black">
                              {word.definition}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Button container - explicit dimensions for both modes */}
                      <div className="order-first flex h-8 w-full justify-end gap-3 md:order-last md:h-20 md:w-1/6 md:justify-evenly md:gap-2 lg:gap-3">
                        {user !== null && user.id === authorID && (
                          <button
                            onClick={() => {
                              if (editWordID === word.id) {
                                if (
                                  editVocabulary === word.vocabulary &&
                                  editDefinition === word.definition
                                ) {
                                  setEditWordID("");
                                  return;
                                }
                                handleEdit(
                                  word.id,
                                  editVocabulary,
                                  editDefinition,
                                );
                              } else {
                                setEditWordID(word.id);
                                setEditVocabulary(word.vocabulary);
                                setEditDefinition(word.definition);
                                setEditVocabularyError("");
                                setEditDefinitionError("");
                              }
                            }}
                            className={`${editWordID === word.id ? "after:content-['儲存']" : "after:content-['編輯']"} relative after:invisible after:absolute after:top-[80%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white hover:cursor-pointer hover:after:visible`}
                          >
                            <GoPencil
                              className={`${editWordID === word.id ? "text-amber-300" : "*:"} h-6 w-6 md:h-5 md:w-5 lg:h-6 lg:w-6`}
                            />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            Speaker(word.vocabulary, word.vocabularySound);
                            Speaker(word.definition, word.definitionSound);
                          }}
                          className="relative after:invisible after:absolute after:top-[80%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white after:content-['播放'] hover:cursor-pointer hover:after:visible"
                        >
                          <HiOutlineSpeakerWave className="h-6 w-6 md:h-5 md:w-5 lg:h-6 lg:w-6" />
                        </button>
                        {user !== null && user.id === authorID && (
                          <button
                            onClick={() => handleStarOne(word.id)}
                            className="relative after:invisible after:absolute after:top-[80%] after:left-[50%] after:h-[25px] after:w-max after:translate-x-[-50%] after:rounded-md after:bg-black after:px-2 after:text-white after:content-['加入最愛'] hover:cursor-pointer hover:after:visible"
                          >
                            <FaStar
                              className={`${word.star ? "text-amber-300" : ""} h-6 w-6 md:h-5 md:w-5 lg:h-6 lg:w-6`}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              {user !== null && user.id === authorID && (
                <div
                  onClick={() => setIsModalOpen(true)}
                  className="absolute top-full left-[50%] translate-x-[-50%]"
                >
                  <IoAddCircleOutline className="text-3xl text-[var(--light-theme-color)] transition-all duration-200 hover:scale-150 hover:cursor-pointer hover:text-[var(--light-theme-color)] md:scale-100 md:text-black" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
