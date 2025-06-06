import { CiImport } from "react-icons/ci";
import { GoGear } from "react-icons/go";
import { HiSwitchHorizontal } from "react-icons/hi";
import { RiDeleteBin7Line } from "react-icons/ri";
import { v4 as uuid } from "uuid";
import { useCallback, useState } from "react";
import { IoAddCircleOutline } from "react-icons/io5";
import AddWordModal from "./AddWordModal";
import { isValidSound, textCount } from "../Utils/utils";
import { useLocalStorage } from "../Hooks/useLocalStorage";
import ConfirmModal from "./ConfirmModal";
import { useNavigate } from "react-router";
import { ImportWord, NoticeDisplay, Word, WordSetType } from "../Types/types";
import { postRequest } from "../Utils/postRequest";
import { PATH, soundArray } from "../Consts/consts";
import { CreateWordSetRequest } from "../Types/request";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";
import SettingWordSetModal from "./SettingWordSetModal";
import ImportModal from "./ImportModal";
import ContentEditable from "./ContentEditable";

export default function CreateWordSet() {
  const oneTimeID = uuid();
  const { user } = useLogInContextProvider();
  const { setNotice } = useNoticeDisplayContextProvider();
  const navigate = useNavigate();
  // 處理allowCopy、isPublic
  const [allowCopy, setAllowCopy, removeAllowCopy] = useLocalStorage(
    "allowCopy",
    true,
  );
  const toggleAllowCopy = useCallback(() => {
    setAllowCopy((prev) => !prev);
  }, []);
  const [isPublic, setIsPublic, removeIsPublic] = useLocalStorage(
    "isPublic",
    true,
  );
  const toggleIsPublic = useCallback(() => {
    setIsPublic((prev) => !prev);
  }, []);
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const closeSettingModal = useCallback(() => {
    setIsSettingModalOpen(false);
  }, []);

  // 開關匯入單字的modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const closeImportModal = useCallback(() => {
    setIsImportModalOpen(false);
  }, []);

  // 處理標題
  const [title, setTitle, removeTitle] = useLocalStorage("title", "");
  // 單字集敘述
  const [description, setDescription, removeDescription] = useLocalStorage(
    "description",
    "",
  );
  // 處理標題、單字集敘述字數錯誤
  const [titleError, setTitleError] = useState<string>("");
  const [descriptionError, setDescriptionError] = useState<string>("");
  // 改成map的形式去紀錄id => error
  // 達成不同單字、註釋有自己的error
  const [vocabularyError, setVocabularyError, removeVocabularyError] =
    useLocalStorage<Record<string, string>>("vocabularyError", {
      [oneTimeID]: "",
    });
  const [definitionError, setDefinitionError, removeDefinitionError] =
    useLocalStorage<Record<string, string>>("definitionError", {
      [oneTimeID]: "",
    });

  const [
    vocabularySoundError,
    setVocabularySoundError,
    removeVocabularySoundError,
  ] = useLocalStorage<Record<string, string>>("vocabularySoundError", {
    [oneTimeID]: "",
  });
  const [
    definitionSoundError,
    setDefinitionSoundError,
    removeDefinitionSoundError,
  ] = useLocalStorage<Record<string, string>>("definitionSoundError", {
    [oneTimeID]: "",
  });

  // 處理交換
  const [shouldSwap, setShouldSwap, removeShouldSwap] =
    useLocalStorage<boolean>("shouldSwap", false);

  const [words, setWords, removeWords] = useLocalStorage<Word[]>("words", [
    // 因為不能讓單字表空掉 所以先給default
    {
      id: oneTimeID,
      order: 1, // 從1開始
      vocabulary: "",
      definition: "",
      vocabularySound: "en-US",
      definitionSound: "zh-TW",
      star: false,
    },
  ]);
  let sortedWords = Object.values(words).sort((a, b) => a.order - b.order);
  // 編輯單字
  const handleEditVocabulary = (wordID: string, newVocabulary: string) => {
    setWords((words) =>
      words.map((word) =>
        word.id === wordID ? { ...word, vocabulary: newVocabulary } : word,
      ),
    );
  };
  // 編輯註釋
  const handleEditDefinition = (wordID: string, newDefinition: string) => {
    setWords((words) =>
      words.map((word) =>
        word.id === wordID ? { ...word, definition: newDefinition } : word,
      ),
    );
  };

  // 用order代表是否開啟，-1則關閉(處理addWord modal)
  const [isModalOpen, setIsModalOpen] = useState<number>(-1);

  // 新增一個單字
  const handleAddWord = useCallback(
    (
      vocabulary: string,
      definition: string,
      order: number,
      vocabularySound: string,
      definitionSound: string,
    ) => {
      const newWordID = uuid();
      setWords((words) => {
        const updatedWords = words.map((word) =>
          word.order >= order ? { ...word, order: word.order + 1 } : word,
        );
        return [
          ...updatedWords,
          {
            id: newWordID, // 用uuid只是為了前端好操作，可以編輯或刪除等等，並不是要給後端用的
            order: order,
            vocabulary: vocabulary,
            definition: definition,
            vocabularySound: vocabularySound,
            definitionSound: definitionSound,
            star: false,
          },
        ];
      });
      setVocabularyError((prev) => ({ ...prev, [newWordID]: "" }));
      setDefinitionError((prev) => ({ ...prev, [newWordID]: "" }));
      setVocabularySoundError((prev) => ({ ...prev, [newWordID]: "" }));
      setDefinitionSoundError((prev) => ({ ...prev, [newWordID]: "" }));
    },
    [],
  );

  // 新增多個單字(匯入)
  const importWords = useCallback(
    (
      importWords: ImportWord[],
      vocabularySound: string,
      definitionSound: string,
      insertIndex: number,
    ): boolean => {
      if (importWords.length === 0) {
        setNotice({
          type: "Error",
          payload: { message: "不得匯入空單字集" },
        } as NoticeDisplay);
        return false;
      }
      if (!isValidSound(vocabularySound)) {
        setNotice({
          type: "Error",
          payload: { message: "單字聲音格式錯誤" },
        } as NoticeDisplay);
        return false;
      }
      if (!isValidSound(definitionSound)) {
        setNotice({
          type: "Error",
          payload: { message: "註釋聲音格式錯誤" },
        } as NoticeDisplay);
        return false;
      }
      if (insertIndex < 0 || insertIndex > words.length) {
        setNotice({
          type: "Error",
          payload: { message: "插入單字位置錯誤" },
        } as NoticeDisplay);
        return false;
      }
      for (const word of importWords) {
        if (word.vocabulary.length === 0) {
          setNotice({
            type: "Error",
            payload: { message: "單字不得為空" },
          } as NoticeDisplay);
          return false;
        }
        if (word.vocabulary.length > 100) {
          setNotice({
            type: "Error",
            payload: { message: "單字不得超過100" },
          } as NoticeDisplay);
          return false;
        }
        if (word.definition.length === 0) {
          setNotice({
            type: "Error",
            payload: { message: "註釋不得為空" },
          } as NoticeDisplay);
          return false;
        }
        if (word.definition.length > 100) {
          setNotice({
            type: "Error",
            payload: { message: "註釋不得超過300" },
          } as NoticeDisplay);
          return false;
        }
      }

      const newIDs: string[] = [];
      setWords((words) => {
        const firstHalf = words.slice(0, insertIndex);
        const secondHalf = words.slice(insertIndex, words.length);
        let startOrder = firstHalf[firstHalf.length - 1]?.order || 1;
        const newWords = [];
        for (const w of importWords) {
          const newID = uuid();
          const newWord: Word = {
            id: newID,
            order: startOrder,
            vocabulary: w.vocabulary,
            definition: w.definition,
            vocabularySound: vocabularySound,
            definitionSound: definitionSound,
            star: false,
          };
          newWords.push(newWord);
          newIDs.push(newID);
          startOrder++;
        }
        // 更新所有後半部分的word的order(接續新增的字的)
        const updatedSecondHalf = secondHalf.map((word, i) => ({
          ...word,
          order: startOrder + i,
        }));
        return firstHalf.concat(newWords, updatedSecondHalf);
      });
      // 用新的IDs新增相對應的error state
      const errorEntries = Object.fromEntries(newIDs.map((id) => [id, ""]));
      setVocabularyError((prev) => ({ ...prev, ...errorEntries }));
      setDefinitionError((prev) => ({ ...prev, ...errorEntries }));
      setVocabularySoundError((prev) => ({ ...prev, ...errorEntries }));
      setDefinitionSoundError((prev) => ({ ...prev, ...errorEntries }));

      return true;
    },
    [],
  );

  // 刪除單字
  const handleDelete = useCallback((wordID: string) => {
    setWords((words) => words.filter((word) => word.id !== wordID));
    setVocabularyError((prev) => {
      const newState = { ...prev }; // shallow copy
      delete newState[wordID];
      return newState;
    });
    setDefinitionError((prev) => {
      const newState = { ...prev }; // shallow copy
      delete newState[wordID];
      return newState;
    });
    setVocabularySoundError((prev) => {
      const newState = { ...prev }; // shallow copy
      delete newState[wordID];
      return newState;
    });
    setDefinitionSoundError((prev) => {
      const newState = { ...prev }; // shallow copy
      delete newState[wordID];
      return newState;
    });
  }, []);

  // 編輯單字發音
  const handleEditWordSound = (wordID: string, newVocabularySound: string) => {
    setWords((words) =>
      words.map((word) =>
        word.id === wordID
          ? { ...word, vocabularySound: newVocabularySound }
          : word,
      ),
    );
  };
  // 編輯註釋發音
  const handleEditDefinitionSound = (
    wordID: string,
    newDefinitionSound: string,
  ) => {
    setWords((words) =>
      words.map((word) =>
        word.id === wordID
          ? { ...word, definitionSound: newDefinitionSound }
          : word,
      ),
    );
  };
  // 交換單字跟註釋
  const handleSwapWordAndDefinition = () => {
    setShouldSwap((prev) => !prev);
    setWords((words) =>
      words.map((word) => ({
        ...word,
        vocabulary: word.definition,
        definition: word.vocabulary,
      })),
    );
  };

  // 處理清除全部/刪除的Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

  // 處理保存送出
  const handleSentConfirm = () => {
    if (title.trim().length === 0) {
      setTitleError("標題不得為空");
      alert("請檢查錯誤");
      return;
    }
    if (title.length > 50) {
      setTitleError("標題不得超過50字元");
      alert("請檢查錯誤");
      return;
    }
    if (description.length > 150) {
      setDescriptionError("單字集敘述不得超過150字元");
      alert("請檢查錯誤");
      return;
    }
    // 檢查單字/註釋/聲音 並且把單字/註釋給trim space 再賦值回去(這樣不會造成re-render但卻修改了word array)
    for (let i = 0; i < words.length; i++) {
      const vocabulary = words[i].vocabulary;
      if (vocabulary.length === 0) {
        setVocabularyError((prev) => ({
          ...prev,
          [words[i].id]: "單字不得為空",
        }));
        alert("請檢查錯誤");
        return;
      }
      if (vocabulary.length > 100) {
        setVocabularyError((prev) => ({
          ...prev,
          [words[i].id]: "單字不得超過100字元",
        }));
        alert("請檢查錯誤");
        return;
      }
      const definition = words[i].definition;
      if (definition.length === 0) {
        setDefinitionError((prev) => ({
          ...prev,
          [words[i].id]: "註釋不得為空",
        }));
        alert("請檢查錯誤");
        return;
      }
      if (definition.length > 300) {
        setDefinitionError((prev) => ({
          ...prev,
          [words[i].id]: "註釋不得超過300字元",
        }));
        alert("請檢查錯誤");
        return;
      }

      if (!isValidSound(words[i].vocabularySound)) {
        setVocabularySoundError((prev) => ({
          ...prev,
          [words[i].id]: "聲音格式錯誤",
        }));
        alert("請檢查錯誤");
        return;
      }
      if (!isValidSound(words[i].definitionSound)) {
        setDefinitionSoundError((prev) => ({
          ...prev,
          [words[i].id]: "聲音格式錯誤",
        }));
        alert("請檢查錯誤");
        return;
      }
      words[i].vocabulary = vocabulary;
      words[i].definition = definition;
    }
    const wordSet: WordSetType = {
      id: "",
      title: title.trim(),
      description: description.trim(),
      authorID: user!.id,
      createdAt: "",
      updatedAt: 0,
      words: words,
      shouldSwap: shouldSwap,
      likedUsers: [],
      likes: 0,
      wordCnt: words.length,
      allowCopy: allowCopy,
      isPublic: isPublic,
    };
    postRequest(`${PATH}/createWordSet`, {
      userID: user?.id || "",
      wordSet: wordSet,
    } as CreateWordSetRequest)
      .then((data) => {
        const wordSetID = data.payload.message;
        // clean up the localStorage for future use
        cleanUp();
        setTimeout(() => {
          setNotice({
            type: "Success",
            payload: { message: "單字集創建成功" },
          });
          navigate(`/wordSet/${wordSetID}`, { replace: false });
        }, 200);
      })
      .catch((error) => {
        setNotice(error as NoticeDisplay);
      });
  };

  const cleanUp = () => {
    removeAllowCopy();
    removeIsPublic();
    removeWords();
    removeTitle();
    removeDescription();
    removeShouldSwap();
    removeVocabularyError();
    removeDefinitionError();
    removeVocabularySoundError();
    removeDefinitionSoundError();
  };

  // if the component is unmounted
  // re-render不會影響是因為我的dependency array是空的
  // 並且re-fresh並不會造成cleanup，因為js來不及做就被re-fresh掉了，要用beforeunload eventListener
  /* useEffect(() => {
    return () => {
      cleanUp();
    };
  }, []); */

  const [modalDescription, setModalDescription] = useState<string>("");
  const [callback, setCallback] = useState<() => void>(() => {});

  const openConfirmModalForDelete = (wordID: string) => {
    setIsConfirmModalOpen(true);
    setModalDescription("確認刪除? 此操作無法復原");
    setCallback(() => () => handleDelete(wordID));
  };

  const openConfirmModalForClear = () => {
    setIsConfirmModalOpen(true);
    setModalDescription("確認清除? 此操作無法復原");
    setCallback(() => () => {
      cleanUp();
      navigate(0);
    });
  };

  return (
    <>
      <SettingWordSetModal
        handleToggleAllowCopy={toggleAllowCopy}
        handleToggleIsPublic={toggleIsPublic}
        isModalOpen={isSettingModalOpen}
        handleClose={closeSettingModal}
        allowCopy={allowCopy}
        isPublic={isPublic}
      />

      <ConfirmModal
        description={modalDescription}
        isModalOpen={isConfirmModalOpen}
        setIsModalOpen={setIsConfirmModalOpen}
        callback={callback}
      />

      <AddWordModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        handleAddWord={handleAddWord}
      />

      <ImportModal
        totalWords={words.length}
        isModalOpen={isImportModalOpen}
        handleClose={closeImportModal}
        handleImport={importWords}
      />

      <div className="flex h-full w-full flex-col gap-4 bg-gray-100 px-[5%] py-[2rem] lg:pr-[10%] lg:pl-[5%]">
        {/* 第一列儲存按扭區 */}
        <div className="flex w-full items-center justify-between">
          <button
            onClick={() => openConfirmModalForClear()}
            className="rounded-lg bg-[var(--light-theme-color)] px-4 py-2 text-[.8rem] font-bold text-white hover:cursor-pointer hover:bg-blue-700 sm:text-[1rem]"
          >
            清除全部
          </button>
          <button
            onClick={() => {
              handleSentConfirm();
            }}
            className="rounded-lg bg-[var(--light-theme-color)] px-4 py-2 text-[.8rem] font-bold text-white hover:cursor-pointer hover:bg-blue-700 sm:text-[1rem]"
          >
            創建
          </button>
        </div>
        {/* 第二列輸入標題區 */}
        <div className="flex w-full flex-col gap-6">
          <div className="w-full rounded-lg bg-white px-4 py-2 text-black">
            <span>標題</span>
            <input
              type="text"
              value={title}
              placeholder={"請輸入標題"}
              onChange={(e) => {
                const text = e.target.value;
                if (textCount(text) > 50) return;
                setTitleError("");
                setTitle(text);
              }}
              className="w-full font-bold outline-none focus:border-b-2 focus:border-amber-300"
            />
            {titleError === "" ? (
              <span className="pt-2 text-[.8rem] font-light">
                標題字數&nbsp;{textCount(title)}/50
              </span>
            ) : (
              <span className="pt-2 text-[.8rem] font-light text-red-500">
                {titleError}
              </span>
            )}
          </div>
          <div className="w-full rounded-lg bg-white px-4 py-2 text-black">
            <textarea
              value={description}
              onChange={(e) => {
                const text = e.target.value;
                if (textCount(text) > 150) return;
                setDescriptionError("");
                setDescription(text);
              }}
              placeholder="輸入單字集敘述(可忽略)"
              className="w-full resize-none font-bold outline-none focus:border-b-2 focus:border-amber-300"
            />
            {descriptionError === "" ? (
              <span className="pt-2 text-[.8rem] font-light">
                敘述字數&nbsp;{textCount(description)}/150
              </span>
            ) : (
              <span className="pt-2 text-[.8rem] font-light text-red-500">
                {descriptionError}
              </span>
            )}
          </div>
        </div>
        {/* 第三列設定區 */}
        <div className="flex w-full items-center justify-between py-4">
          <div
            onClick={() => setIsImportModalOpen(true)}
            className="flex gap-2 rounded-lg border-2 border-gray-300 bg-white p-2 hover:cursor-pointer hover:bg-gray-300"
          >
            <CiImport className="h-6 w-6" />
            <span>匯入</span>
          </div>
          <div className="flex gap-4">
            <div
              onClick={() => setIsSettingModalOpen(true)}
              className="group relative"
            >
              <GoGear className="h-10 w-10 rounded-[50%] border-2 border-gray-300 bg-white p-1 hover:cursor-pointer hover:bg-gray-300" />
              <span className="absolute top-[110%] left-[50%] z-2 hidden w-max -translate-x-[50%] rounded-lg bg-black p-2 text-white group-hover:block">
                設定
              </span>
            </div>
            <div
              onClick={() => handleSwapWordAndDefinition()}
              className="group relative hidden md:block"
            >
              <HiSwitchHorizontal className="h-10 w-10 rounded-[50%] border-2 border-gray-300 bg-white p-1 hover:cursor-pointer hover:bg-gray-300" />
              <span className="absolute top-[110%] left-[50%] z-2 hidden w-max -translate-x-[50%] rounded-lg bg-black p-2 text-white group-hover:block">
                交換單字跟註釋
              </span>
            </div>
            <button
              onClick={() => handleSwapWordAndDefinition()}
              className="block rounded-lg border-2 border-gray-300 bg-white p-2 text-[.8rem] md:hidden"
            >
              交換單字跟註釋
            </button>
          </div>
        </div>
        {/* 單字列表區 */}
        <div className="flex w-full flex-col">
          {/* 白色區域 */}
          {sortedWords.map((word, index) => (
            <div
              key={word.id}
              className="relative flex w-full flex-col gap-[2px]"
            >
              <div className="flex h-[45px] w-full items-center justify-between rounded-t-lg bg-white px-5 sm:h-[55px]">
                <span className="font-bold">{index + 1}</span>
                {sortedWords.length > 1 ? (
                  <div
                    onClick={() => {
                      openConfirmModalForDelete(word.id);
                    }}
                    className="group relative"
                  >
                    <RiDeleteBin7Line className="h-6 w-6 rounded-[50%] hover:cursor-pointer" />
                    <span className="absolute top-[110%] left-[50%] hidden w-max -translate-x-[50%] rounded-lg bg-black p-1 text-[.8rem] text-white group-hover:block">
                      刪除該單字
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="flex max-h-auto min-h-[110px] w-full flex-col gap-4 rounded-b-lg bg-white p-4 sm:h-[130px] sm:flex-row sm:gap-0">
                <div className="flex w-full flex-col items-start justify-center gap-2 sm:w-[40%]">
                  <ContentEditable
                    content={word.vocabulary}
                    updateContent={(newContent: string) => {
                      if (textCount(newContent) > 100) return;
                      setVocabularyError((prev) => ({
                        ...prev,
                        [word.id]: "",
                      }));
                      handleEditVocabulary(word.id, newContent);
                    }}
                    className={`${vocabularyError[word.id] === "" && vocabularySoundError[word.id] === "" ? "" : "border-red-500"} w-full resize-none border-b-[3px] border-black text-[1.2rem] break-words text-black outline-none focus:border-amber-300`}
                  ></ContentEditable>
                  <div className="flex w-full items-center justify-between text-[.8rem] md:text-[1rem]">
                    {vocabularyError[word.id] === "" &&
                    vocabularySoundError[word.id] === "" ? (
                      <span>單字&nbsp;{textCount(word.vocabulary)}/100</span>
                    ) : (
                      <span className="pt-2 text-[.8rem] font-light text-red-500">
                        {vocabularyError[word.id] !== ""
                          ? vocabularyError[word.id]
                          : vocabularySoundError[word.id]}
                      </span>
                    )}
                    <select
                      className="text-[var(--light-theme-color)]"
                      value={word.vocabularySound}
                      onChange={(e) => {
                        setVocabularySoundError((prev) => ({
                          ...prev,
                          [word.id]: "",
                        }));
                        handleEditWordSound(word.id, e.target.value);
                      }}
                    >
                      {soundArray.map((sound, index) => (
                        <option
                          key={`vocabularySound-${index}`}
                          value={sound.EngName}
                        >
                          {sound.TwName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="ml-auto flex w-full flex-col items-start justify-center gap-2 sm:w-[55%]">
                  <ContentEditable
                    content={word.definition}
                    updateContent={(newContent: string) => {
                      if (textCount(newContent) > 300) return;
                      setDefinitionError((prev) => ({
                        ...prev,
                        [word.id]: "",
                      }));
                      handleEditDefinition(word.id, newContent);
                    }}
                    className={`${definitionError[word.id] === "" && definitionSoundError[word.id] === "" ? "" : "border-red-500"} w-full resize-none border-b-[3px] border-black text-[1.2rem] break-words text-black outline-none focus:border-amber-300`}
                  ></ContentEditable>
                  <div className="flex w-full items-center justify-between text-[.8rem] md:text-[1rem]">
                    {definitionError[word.id] === "" &&
                    definitionSoundError[word.id] === "" ? (
                      <span>註釋&nbsp;{textCount(word.definition)}/300</span>
                    ) : (
                      <span className="pt-2 text-[.8rem] font-light text-red-500">
                        {definitionError[word.id] !== ""
                          ? definitionError[word.id]
                          : definitionSoundError[word.id]}
                      </span>
                    )}
                    <select
                      className="text-[var(--light-theme-color)]"
                      value={word.definitionSound}
                      onChange={(e) => {
                        {
                          handleEditDefinitionSound(word.id, e.target.value);
                          setDefinitionSoundError((prev) => ({
                            ...prev,
                            [word.id]: "",
                          }));
                        }
                      }}
                    >
                      {soundArray.map((sound, index) => (
                        <option
                          key={`definitionSound-${index}`}
                          value={sound.EngName}
                        >
                          {sound.TwName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div
                onClick={() => setIsModalOpen(word.order + 1)} // 代表下一個新創建的word應該要有的order
                className="group z-2 flex w-full items-center justify-center hover:cursor-pointer"
              >
                <IoAddCircleOutline className="scale-100 text-2xl text-[var(--light-theme-color)] transition-all duration-200 group-hover:scale-150 group-hover:text-[var(--light-theme-color)] sm:scale-0 sm:text-black" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
