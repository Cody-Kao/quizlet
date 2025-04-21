import { useEffect, useState } from "react";
import { Word, NoticeDisplay } from "../Types/types";
import { postRequest } from "../Utils/postRequest";
import { PATH } from "../Consts/consts";
import { AddWordRequest, BigWordCardUpdateWordRequest } from "../Types/request";
import { isValidSound } from "../Utils/utils";
import ClipLoader from "react-spinners/ClipLoader";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";

export default function AddOrEditWordModal({
  wordSetID,
  isModalOpen,
  setIsModalOpen,
  curWord,
  mode, // true => Add Word, false => Edit Word
  starMode, // true => Add star word, false => Add non-star word
  setWords,
  order,
}: {
  wordSetID: string;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  curWord?: Word;
  mode: boolean;
  starMode: boolean;
  setWords: React.Dispatch<React.SetStateAction<Word[]>>;
  order?: number;
}) {
  const { setNotice } = useNoticeDisplayContextProvider();
  const [vocabularySound, setVocabularySound] = useState<string>(
    mode ? "en-US" : (curWord?.vocabularySound ?? ""),
  );
  const [definitionSound, setDefinitionSound] = useState<string>(
    mode ? "en-US" : (curWord?.definitionSound ?? ""),
  );
  const addWord = (
    vocabulary: string,
    definition: string,
    vocabularySound: string,
    definitionSound: string,
  ) => {
    const newVocabulary = vocabulary.trim();
    const newDefinition = definition.trim();
    const newVocabularySound = vocabularySound.trim();
    const newDefinitionSound = definitionSound.trim();
    console.log("聲音格式", "v: ", vocabularySound, "d: ", definitionSound);
    if (newVocabulary.trim() === "") {
      setVocabularyError("單字不得為空");
      return;
    } else if (newVocabulary.length > 100) {
      setVocabularyError("單字不得超過100個字");
      return;
    } else {
      setVocabularyError("");
    }
    if (newDefinition.trim() === "") {
      setDefinitionError("註釋不得為空");
      return;
    } else if (newDefinition.length > 300) {
      setDefinitionError("註釋不得超過300個字");
      return;
    } else {
      setDefinitionError("");
    }
    if (!isValidSound(newVocabularySound)) {
      setVocabularyError("聲音格式錯誤");
      return;
    } else if (!isValidSound(newDefinitionSound)) {
      setDefinitionError("聲音格式錯誤");
      return;
    }

    const newWord = {
      order: order,
      vocabulary: newVocabulary, // Use function argument
      definition: newDefinition, // Use function argument
      star: starMode,
      vocabularySound: vocabularySound,
      definitionSound: definitionSound,
    } as Word;
    setIsAddWordLoading(true);
    postRequest(`${PATH}/addWord`, {
      wordSetID: wordSetID,
      word: newWord,
    } as AddWordRequest)
      .then((data) => {
        newWord.id = data.payload.message; // 取得後端回傳的wordID，這樣前端就可以控制他
        setWords((prevWords) => [
          ...prevWords, // Keep existing words
          newWord,
        ]);
        setNotice({ type: "Success", payload: { message: "新增單字成功" } });
      })
      .catch((error) => {
        setNotice(error as NoticeDisplay);
      })
      .finally(() => {
        // 新增完單字記得清空
        setIsAddWordLoading(false);
        setVocabulary("");
        setDefinition("");
        setIsModalOpen(false);
      });
  };

  const editWord = (
    wordID: string,
    vocabulary: string,
    definition: string,
    vocabularySound: string,
    definitionSound: string,
  ) => {
    const newVocabulary = vocabulary.trim();
    const newDefinition = definition.trim();
    const newVocabularySound = vocabularySound.trim();
    const newDefinitionSound = definitionSound.trim();
    if (newVocabulary === "") {
      setVocabularyError("單字不得為空");
      return;
    } else if (newVocabulary.length > 100) {
      setVocabularyError("單字不得超過100個字");
      return;
    } else {
      setVocabularyError("");
    }
    if (newDefinition === "") {
      setDefinitionError("註釋不得為空");
      return;
    } else if (newDefinition.length > 300) {
      setDefinitionError("註釋不得超過300個字");
      return;
    } else {
      setDefinitionError("");
    }
    if (!isValidSound(newVocabularySound)) {
      setVocabularyError("聲音格式錯誤");
      return;
    } else if (!isValidSound(newDefinitionSound)) {
      setDefinitionError("聲音格式錯誤");
      return;
    }
    setIsEditWordLoading(true);
    postRequest(`${PATH}/bigWordCardUpdateWord`, {
      wordSetID: wordSetID,
      wordID: wordID,
      newVocabulary: newVocabulary,
      newDefinition: newDefinition,
      newVocabularySound: newVocabularySound,
      newDefinitionSound: newDefinitionSound,
    } as BigWordCardUpdateWordRequest)
      .then(() => {
        setWords((preWords) =>
          preWords.map((word) =>
            word.id === wordID
              ? {
                  ...word,
                  vocabulary: newVocabulary,
                  definition: newDefinition,
                  vocabularySound: newVocabularySound,
                  definitionSound: newDefinitionSound,
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
        setIsEditWordLoading(false);
        setIsModalOpen(false);
      });
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setVocabularyError("");
    setDefinitionError("");
    setVocabulary(curWord?.vocabulary ?? ""); // 重製word跟definition
    setDefinition(curWord?.definition ?? "");
    setVocabularySound(curWord?.vocabularySound ?? ""); // 重製word跟definition
    setDefinitionSound(curWord?.definitionSound ?? "");
  };

  // Modal目前的vocabulary跟definition
  const [vocabulary, setVocabulary] = useState<string>(
    mode ? "" : curWord?.vocabulary || "",
  );
  const [definition, setDefinition] = useState<string>(
    mode ? "" : curWord?.definition || "",
  );
  // Sync state with new curWord when parent updates it
  useEffect(() => {
    setVocabulary(mode ? "" : curWord?.vocabulary || "");
    setDefinition(mode ? "" : curWord?.definition || "");
    setVocabularySound(mode ? "en-US" : curWord?.vocabularySound || "en-US");
    setDefinitionSound(mode ? "zh-TW" : curWord?.definitionSound || "zh-TW");
  }, [curWord, mode, isModalOpen]); // Add isModalOpen dependency

  const [vocabularyError, setVocabularyError] = useState<string>("");
  const [definitionError, setDefinitionError] = useState<string>("");

  const [isEditWordLoading, setIsEditWordLoading] = useState<boolean>(false);
  const [isAddWordLoading, setIsAddWordLoading] = useState<boolean>(false);

  return (
    <>
      {/* overlay */}
      <div
        onClick={() => handleClose()}
        className={`${isModalOpen ? "block" : "hidden"} fixed inset-0 z-1000 bg-black opacity-30`}
      ></div>

      {/* modal */}

      <div
        className={`${isModalOpen ? "visible top-[50%] opacity-100" : "invisible top-[40%] opacity-0"} fixed left-[50%] z-1000 flex max-h-[350px] w-[90%] max-w-[380px] translate-x-[-50%] translate-y-[-50%] flex-col gap-4 rounded-2xl bg-white p-8 transition-all duration-300 sm:max-h-[450px] sm:max-w-[630px] sm:p-12 lg:max-h-[480px] lg:max-w-[800px]`}
      >
        {/* cross button */}
        <button
          onClick={() => handleClose()}
          className="absolute top-[.5rem] right-5 h-[2rem] w-[2rem] text-lg hover:cursor-pointer sm:top-[1rem] sm:text-2xl"
        >
          &#x2716;
        </button>
        {/* modal content */}
        {/* Title */}
        <h1 className="mb-[15px] text-2xl font-bold sm:mb-[30px] sm:text-4xl md:text-3xl">
          {mode ? "新增單詞" : "編輯單詞"}
        </h1>
        <div className="flex flex-col gap-[40px] md:gap-[80px]">
          <div className="group w-full">
            <textarea
              placeholder={mode ? "輸入單字" : ""}
              value={vocabulary}
              onChange={(e) => {
                setVocabulary(e.target.value);
                setVocabularyError("");
              }}
              className="mt-1 w-full resize-none text-2xl leading-none break-words outline-none"
            ></textarea>
            <div
              className={`${vocabularyError ? "bg-red-500 after:block" : "after:hidden"} relative mt-[-10px] h-[5px] w-full bg-black transition-colors group-focus-within:bg-amber-300 after:absolute after:top-full after:content-['']`}
            ></div>
            <div className="flex w-full items-center justify-between text-[.8rem] md:text-[1rem]">
              <span>
                {vocabularyError === "" ? (
                  <>單字 {vocabulary.length}/ 100</> // Fragment to avoid extra span
                ) : (
                  vocabularyError
                )}
              </span>
              <select
                className="text-[var(--light-theme-color)]"
                value={vocabularySound}
                onChange={(e) => setVocabularySound(e.target.value)}
              >
                <option value={"en-US"}>英語(美式)</option>
                <option value={"en-GB"}>英語(英式)</option>
                <option value={"en-AU"}>英語(澳洲)</option>
                <option value={"zh-TW"}>中文(繁體)</option>
                <option value={"zh-CN"}>中文(簡體)</option>
              </select>
            </div>
          </div>
          <div className="group w-full">
            <textarea
              placeholder={mode ? "輸入註釋" : ""}
              value={definition}
              onChange={(e) => {
                setDefinition(e.target.value);
                setDefinitionError("");
              }}
              className="mt-1 w-full resize-none text-2xl leading-none break-words outline-none"
            ></textarea>
            <div
              className={`${definitionError ? "bg-red-500 after:block" : "after:hidden"} relative mt-[-10px] h-[5px] w-full bg-black transition-colors group-focus-within:bg-amber-300 after:absolute after:top-full after:content-['']`}
            ></div>
            <div className="flex w-full items-center justify-between text-[.8rem] md:text-[1rem]">
              <span>
                {definitionError === "" ? (
                  <>註釋 {definition.length}/ 300</> // Fragment to avoid extra span
                ) : (
                  definitionError
                )}
              </span>
              <select
                className="text-[var(--light-theme-color)]"
                value={definitionSound}
                onChange={(e) => {
                  setDefinitionSound(e.target.value);
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
        <div className="mt-auto flex w-full items-center justify-end gap-6">
          <button
            onClick={() => handleClose()}
            className="rounded-xl p-2 font-bold text-[var(--light-theme-color)] hover:cursor-pointer hover:bg-gray-200 sm:p-3 sm:text-2xl"
          >
            取消
          </button>
          {isEditWordLoading || isAddWordLoading ? (
            <ClipLoader />
          ) : (
            <button
              onClick={() => {
                if (mode) {
                  addWord(
                    vocabulary,
                    definition,
                    vocabularySound,
                    definitionSound,
                  );
                } else {
                  editWord(
                    curWord?.id ?? "",
                    vocabulary,
                    definition,
                    vocabularySound,
                    definitionSound,
                  );
                }
              }}
              className={`${isEditWordLoading || isAddWordLoading ? "pointer-events-none" : ""} rounded-xl bg-[var(--light-theme-color)] p-2 font-bold text-white hover:cursor-pointer hover:bg-blue-700 sm:p-3 sm:text-2xl`}
            >
              確認
            </button>
          )}
        </div>
      </div>
    </>
  );
}
