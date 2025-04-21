import { CiImport } from "react-icons/ci";
import { GoGear } from "react-icons/go";
import { HiSwitchHorizontal } from "react-icons/hi";
import { RiDeleteBin7Line } from "react-icons/ri";
import { v4 as uuid } from "uuid";
import { useEffect, useState } from "react";
import { EditWord, EditWordSetType, NoticeDisplay, Word } from "../Types/types";
import { IoAddCircleOutline } from "react-icons/io5";
import AddWordModal from "./AddWordModal";
import ConfirmModal from "./ConfirmModal";
import { textCount } from "../Utils/utils";
import { useLocalStorage } from "../Hooks/useLocalStorage";
import { useNavigate } from "react-router";
import { WordSetType } from "../Types/types";
import { EditWordSetRequest } from "../Types/request";
import { postRequest } from "../Utils/postRequest";
import { PATH } from "../Consts/consts";
import ContentEditable from "./ContentEditable";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";
import SettingWordSetModal from "./SettingWordSetModal";
import { useLogInContextProvider } from "../Context/LogInContextProvider";

// true代表fork單字集 false代表編輯單字集
export default function EditWordSet({ wordSet }: { wordSet: WordSetType }) {
  const { user } = useLogInContextProvider();
  const { setNotice } = useNoticeDisplayContextProvider();
  const navigate = useNavigate();
  const wordSetID = wordSet.id;

  // 這個是給reflect"修改"單字集的states
  // 也是所有words的single source of truth
  const [currentWords, setCurrentWords, removeCurrentWords] = useLocalStorage<
    Record<string, Word>
  >(
    "currentWords",
    wordSet.words.reduce(
      (record, word) => {
        record[word.id] = wordSet.shouldSwap
          ? {
              ...word,
              vocabulary: word.definition,
              definition: word.vocabulary,
              vocabularySound: word.definitionSound,
              definitionSound: word.vocabularySound,
            }
          : word;
        return record;
      },
      {} as Record<string, Word>,
    ),
  );

  // 這是紀錄原有的所有words，最後會跟words state做比對，找出edit word跟add word
  const [oldWords, setOldWords, removeOldWords] = useLocalStorage<
    Record<string, Word>
  >(
    "oldWords",
    wordSet.words.reduce(
      (record, word) => {
        record[word.id] = wordSet.shouldSwap
          ? {
              ...word,
              vocabulary: word.definition,
              definition: word.vocabulary,
              vocabularySound: word.definitionSound,
              definitionSound: word.vocabularySound,
            }
          : word;
        return record;
      },
      {} as Record<string, Word>,
    ),
  );
  // 處理編輯currentWords的函數
  const handleEditWord = (
    wordID: string,
    field: keyof Word,
    value: string | number,
  ) => {
    setCurrentWords((prev) => ({
      ...prev,
      [wordID]: {
        ...prev[wordID], // 保留其餘fields
        [field]: value, // 更新需要的field
      },
    }));
  };

  // 處理wordToAdd的函數，要注意order問題(插入在中間時)
  const handleWordToAdd = (
    newVocabulary: string,
    newDefinition: string,
    order: number,
    vocabularySound: string,
    definitionSound: string,
  ) => {
    // 插入新單字=>更新其他單字的order
    setCurrentWords((prev) => {
      const updatedWords = Object.fromEntries(
        Object.entries(prev).map(([id, word]) => [
          id,
          word.order >= order ? { ...word, order: word.order + 1 } : word,
        ]),
      );
      // 然後加入
      const newWord: Word = {
        id: uuid(),
        vocabulary: newVocabulary,
        definition: newDefinition,
        star: false,
        order: order,
        vocabularySound: vocabularySound,
        definitionSound: definitionSound,
      };

      return { ...updatedWords, [newWord.id]: newWord };
    });
  };

  // 處理wordToRemove的函數
  const handleWordToRemove = (wordID: string | null) => {
    if (wordID === null) return;
    // 轉成array再變回record
    setCurrentWords((prev) => {
      const updatedWords = Object.fromEntries(
        Object.entries(prev).filter(([id]) => id !== wordID),
      );
      return updatedWords;
    });
  };

  const handleEditVocabulary = (wordID: string, newVocabulary: string) => {
    if (newVocabulary.length > 100) return;
    handleEditWord(wordID, "vocabulary", newVocabulary);
  };
  const handleEditDefinition = (wordID: string, newDefinition: string) => {
    if (newDefinition.length > 300) return;
    handleEditWord(wordID, "definition", newDefinition);
  };
  const handleEditVocabularySound = (
    wordID: string,
    vocabularySound: string,
  ) => {
    handleEditWord(wordID, "vocabularySound", vocabularySound);
  };
  const handleEditDefinitionSound = (
    wordID: string,
    definitionSound: string,
  ) => {
    handleEditWord(wordID, "definitionSound", definitionSound);
  };

  const [shouldSwap, setShouldSwap, removeShouldSwap] =
    useLocalStorage<boolean>("shouldSwap", wordSet.shouldSwap);
  const handleSwapWordAndDefinition = () => {
    setCurrentWords((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, word]) => [
          id,
          {
            ...word,
            vocabulary: word.definition,
            definition: word.vocabulary,
            vocabularySound: word.definitionSound,
            definitionSound: word.vocabularySound,
          },
        ]),
      ),
    );
    setOldWords((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, word]) => [
          id,
          {
            ...word,
            vocabulary: word.definition,
            definition: word.vocabulary,
            vocabularySound: word.definitionSound,
            definitionSound: word.vocabularySound,
          },
        ]),
      ),
    );

    // 不一定要動整包資料
    /* for (const word of words) {
      handleEditWordField(word.id, "word", word.definition);
      handleEditWordField(word.id, "definition", word.word);
    } */
    // 可以傳一個boolean給後端，這樣後端就知道最後要調換，而這會是最後的DB更改部分
    // 而DB也不用真的去調換，而是記住這個boolean數值，傳回給前端這樣就知道要交換了
    setShouldSwap((prev) => !prev);
  };

  // 用order代表是否開啟，-1則關閉
  const [isAddModalOpen, setIsAddModalOpen] = useState<number>(-1);

  // confirm modal的開關
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  // confirm modal的description
  const [modalDescription, setModalDescription] = useState<string>("");
  // confirm modal的callback
  const [callback, setCallback] = useState<() => void>(() => {});
  // 處理不保存退出的Modal
  const handleExit = () => {
    setIsModalOpen(true);
    setModalDescription("確認離開? 任何變更皆不會保留");
    setCallback(() => () => {
      cleanUp();
      navigate(`/wordSet/${wordSetID}`);
    });
  };
  // 處理刪除單字的Modal
  const handleDeleteWord = (wordID: string) => {
    setIsModalOpen(true);
    setModalDescription("確認刪除? 此項操作無法復原");
    setCallback(() => () => {
      handleWordToRemove(wordID);
    });
  };

  // 設定modal
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);

  // 處理標題、單字集敘述
  const [title, setTitle, removeTitle] = useLocalStorage<string>(
    "editTitle",
    wordSet.title,
  );
  const [description, setDescription, removeDescription] =
    useLocalStorage<string>("editDescription", wordSet.description);

  // 處理標題、單字集敘述字數錯誤
  const [titleError, setTitleError] = useState<string>("");
  const [descriptionError, setDescriptionError] = useState<string>("");

  // 處理保存送出
  const handleSentConfirm = () => {
    if (title.trim().length === 0) {
      setTitleError("標題不得為空");
      return;
    }
    if (title.length > 25) {
      setTitleError("標題不得超過25字元");
      return;
    }

    if (description.length > 150) {
      setDescriptionError("單字集敘述不得超過150字元");
      return;
    }

    // addWords、editWords
    const addWords: Word[] = [];
    const editWords: EditWord[] = [];
    Object.entries(currentWords).forEach(([id, word]) => {
      // 在舊有的words裡面就比對是否有要更新
      if (id in oldWords) {
        const oldWord = oldWords[id];
        // Generate updated fields
        const updatedWord: EditWord = {
          id: word.id,
          order: word.order !== oldWord.order ? word.order : 0, // Default value: 0
          vocabulary:
            word.vocabulary !== oldWord.vocabulary ? word.vocabulary : "",
          definition:
            word.definition !== oldWord.definition ? word.definition : "",
          vocabularySound:
            word.vocabularySound !== oldWord.vocabularySound
              ? word.vocabularySound
              : "",
          definitionSound:
            word.definitionSound !== oldWord.definitionSound
              ? word.definitionSound
              : "",
        };

        // Check if any field has changed
        const hasChanges = Object.values(updatedWord).some((value) =>
          typeof value === "string" ? value !== "" : value !== 0,
        );
        if (hasChanges) {
          editWords.push(updatedWord);
        }
      } else {
        // 若不在舊有的words裡面，就是要新增
        addWords.push(word);
      }
    });
    // removeWords
    const removeWords: string[] = [];
    Object.entries(oldWords).forEach(([id, _]) => {
      if (!(id in currentWords)) {
        removeWords.push(id);
      }
    });
    // wordSet
    const editWordSet: EditWordSetType = {
      id: wordSetID || "",
      title: wordSet.title !== title ? title : "",
      description: description,
      words: editWords,
      shouldSwap: shouldSwap,
    };
    // 產生request
    const request: EditWordSetRequest = {
      addWords: addWords,
      wordSet: editWordSet,
      removeWords: removeWords,
    };

    postRequest(`${PATH}/updateWordSet`, request as EditWordSetRequest)
      .then(() => {
        cleanUp();
        setTimeout(() => {
          setNotice({
            type: "Success",
            payload: { message: "編輯單字集成功" },
          });
        }, 300); // Let the navigation settle first
        navigate(`/wordSet/${wordSetID}`);
      })
      .catch((error) => {
        setNotice(error as NoticeDisplay);
      });
  };

  // clean up all the localStorage states
  const cleanUp = () => {
    removeCurrentWords();
    removeOldWords();
    removeShouldSwap();
    removeTitle();
    removeDescription();
  };

  useEffect(() => {
    return () => {
      cleanUp();
    };
  }, []);

  const words: Word[] = Object.entries(currentWords)
    .sort((a, b) => a[1].order - b[1].order) // Sort by 'order'
    .map(([_, word]) => word); // Extract only the Word objects

  return (
    <>
      <ConfirmModal
        description={modalDescription}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        callback={() => {
          callback();
        }}
      />

      <AddWordModal
        isModalOpen={isAddModalOpen}
        setIsModalOpen={setIsAddModalOpen}
        handleWordToAdd={handleWordToAdd}
      />

      <SettingWordSetModal
        userID={user?.id || ""}
        wordSetID={wordSet.id}
        isModalOpen={isSettingModalOpen}
        handleClose={() => setIsSettingModalOpen(false)}
        allowCopy={wordSet.allowCopy}
        isPublic={wordSet.isPublic}
      />

      <div className="flex h-full w-full flex-col gap-4 bg-gray-100 px-[5%] py-[2rem] lg:pr-[10%] lg:pl-[5%]">
        {/* 第一列儲存按扭區 */}
        <div className="flex w-full items-center justify-between">
          <button
            onClick={() => {
              handleExit();
            }}
            className="rounded-lg bg-[var(--light-theme-color)] px-4 py-2 text-[.8rem] font-bold text-white hover:cursor-pointer hover:bg-blue-700 sm:text-[1rem]"
          >
            不保存回到單字集
          </button>
          <button
            onClick={() => handleSentConfirm()}
            className="rounded-lg bg-[var(--light-theme-color)] px-4 py-2 text-[.8rem] font-bold text-white hover:cursor-pointer hover:bg-blue-700 sm:text-[1rem]"
          >
            保存
          </button>
        </div>
        {/* 第二列輸入標題區 */}
        <div className="flex w-full flex-col gap-6">
          <div className="w-full rounded-lg bg-white px-4 py-2 text-black">
            <span>標題</span>
            <input
              type="text"
              value={title}
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
              placeholder="輸入單字集敘述"
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
          <div className="flex gap-2 rounded-lg border-2 border-gray-300 bg-white p-2 hover:cursor-pointer hover:bg-gray-300">
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
              className="group relative hidden sm:block"
            >
              <HiSwitchHorizontal className="h-10 w-10 rounded-[50%] border-2 border-gray-300 bg-white p-1 hover:cursor-pointer hover:bg-gray-300" />
              <span className="absolute top-[110%] left-[50%] z-2 hidden w-max -translate-x-[50%] rounded-lg bg-black p-2 text-white group-hover:block">
                交換單字跟註釋
              </span>
            </div>
            <button
              onClick={() => handleSwapWordAndDefinition()}
              className="block rounded-lg border-2 border-gray-300 bg-white p-2 text-[.8rem] sm:hidden"
            >
              交換單字跟註釋
            </button>
          </div>
        </div>
        {/* 單字列表區 */}
        <div className="flex w-full flex-col">
          {/* 白色區域 */}
          {words.map((word, index) => (
            <div
              key={word.id}
              className="relative flex w-full flex-col gap-[2px]"
            >
              <div className="flex h-[45px] w-full items-center justify-between rounded-t-lg bg-white px-5 sm:h-[55px]">
                <span className="font-bold">{index + 1}</span>
                <div
                  onClick={() => {
                    handleDeleteWord(word.id);
                  }}
                  className="group relative"
                >
                  <RiDeleteBin7Line className="h-6 w-6 rounded-[50%] hover:cursor-pointer" />
                  <span className="absolute top-[110%] left-[50%] hidden w-max -translate-x-[50%] rounded-lg bg-black p-1 text-[.8rem] text-white group-hover:block">
                    刪除該單字
                  </span>
                </div>
              </div>
              <div className="flex max-h-auto min-h-[110px] w-full flex-col gap-4 rounded-b-lg bg-white p-4 sm:h-[130px] sm:flex-row sm:gap-0">
                <div className="flex w-full flex-col items-start justify-center gap-2 sm:w-[40%]">
                  <ContentEditable
                    content={word.vocabulary}
                    updateContent={(newVocabulary: string) => {
                      if (newVocabulary.length > 100) return;
                      handleEditVocabulary(word.id, newVocabulary);
                    }}
                    className="w-full resize-none border-b-[3px] border-black text-[1.2rem] break-words break-all text-black outline-none focus:border-amber-300"
                  />
                  {/* <textarea
                    value={word.vocabulary}
                    onChange={(e) => {
                      if (e.target.value.length >= 100) return;
                      handleEditVocabulary(word.id, e.target.value);
                    }}
                    rows={1}
                    className="w-full resize-none border-b-[3px] border-black text-[1.2rem] break-words text-black outline-none focus:border-amber-300"
                  ></textarea> */}
                  <div className="flex w-full items-center justify-between text-[.8rem] md:text-[1rem]">
                    <span>單字&nbsp;{word.vocabulary.length}/100</span>
                    <select
                      className="text-[var(--light-theme-color)]"
                      value={word.vocabularySound}
                      onChange={(e) => {
                        handleEditVocabularySound(word.id, e.target.value);
                      }}
                    >
                      <option value={"en-US"}>英語(美式)</option>
                      <option value={"en-GB"}>英語(英式)</option>
                      <option value={"en-AU"}>英語(澳洲)</option>
                      <option value={"zh-TW"}>中文(繁體)</option>
                      <option value={"zh-CN"}>中文(簡體)</option>
                    </select>
                  </div>
                </div>
                <div className="ml-auto flex w-full flex-col items-start justify-center gap-2 sm:w-[55%]">
                  <ContentEditable
                    content={word.definition}
                    updateContent={(newDefinition: string) => {
                      if (newDefinition.length > 300) return;
                      handleEditDefinition(word.id, newDefinition);
                    }}
                    className="w-full resize-none border-b-[3px] border-black text-[1.2rem] break-words break-all text-black outline-none focus:border-amber-300"
                  />
                  {/* <textarea
                    value={word.definition}
                    onChange={(e) => {
                      if (e.target.value.length >= 300) return;
                      handleEditDefinition(word.id, e.target.value);
                    }}
                    className="w-full resize-none border-b-[3px] border-black text-[1.2rem] break-words text-black outline-none focus:border-amber-300"
                  ></textarea> */}
                  <div className="flex w-full items-center justify-between text-[.8rem] md:text-[1rem]">
                    <span>註釋&nbsp;{word.definition.length}/300</span>
                    <select
                      className="text-[var(--light-theme-color)]"
                      value={word.definitionSound}
                      onChange={(e) => {
                        handleEditDefinitionSound(word.id, e.target.value);
                      }}
                    >
                      <option value={"en-US"}>英語(美式)</option>
                      <option value={"en-GB"}>英語(英式)</option>
                      <option value={"en-AU"}>英語(澳洲)</option>
                      <option value={"zh-TW"}>中文(繁體)</option>
                      <option value={"zh-CN"}>中文(簡體)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div
                onClick={() => setIsAddModalOpen(word.order + 1)} // 代表下一個新創建的word應該要有的order
                className="group z-2 flex w-full items-center justify-center hover:cursor-pointer"
              >
                <IoAddCircleOutline className="scale-100 text-2xl text-[var(--light-theme-color)] transition-all duration-200 group-hover:scale-150 group-hover:cursor-pointer group-hover:text-[var(--light-theme-color)] sm:scale-0 sm:text-black" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
