import { useState } from "react";
import { isValidSound } from "../Utils/utils";

export default function AddWordModal({
  isModalOpen,
  setIsModalOpen,
  handleWordToAdd,
  handleAddWord,
}: {
  isModalOpen: number; // 用這個儲存新單字的order
  setIsModalOpen: React.Dispatch<React.SetStateAction<number>>;
  // 這是給EditWordSet在用的
  handleWordToAdd?: (
    vocabulary: string,
    definition: string,
    order: number,
    vocabularySound: string,
    definitionSound: string,
  ) => void;
  // 這是給CreateWordSet用的
  handleAddWord?: (
    vocabulary: string,
    definition: string,
    order: number,
    vocabularySound: string,
    definitionSound: string,
  ) => void;
}) {
  // Modal目前的vocabulary跟definition
  const [vocabulary, setVocabulary] = useState<string>("");
  const [definition, setDefinition] = useState<string>("");
  const [vocabularyError, setVocabularyError] = useState<string>("");
  const [definitionError, setDefinitionError] = useState<string>("");

  const [vocabularySound, setVocabularySound] = useState<string>("en-US");
  const [definitionSound, setDefinitionSound] = useState<string>("zh-TW");
  const [vocabularySoundError, setVocabularySoundError] = useState<string>("");
  const [definitionSoundError, setDefinitionSoundError] = useState<string>("");

  const handleConfirm = () => {
    if (vocabulary.trim() === "") {
      setVocabularyError("單字不得為空");
      return;
    } else if (vocabulary.length > 100) {
      setVocabularyError("單字不得超過100個字");
      return;
    } else {
      setVocabularyError("");
    }
    if (definition.trim() === "") {
      setDefinitionError("註釋不得為空");
      return;
    } else if (definition.length > 300) {
      setDefinitionError("註釋不得超過300個字");
      return;
    } else {
      setDefinitionError("");
    }
    if (!isValidSound(vocabularySound)) {
      setVocabularySoundError("聲音格式錯誤");
      return;
    }
    if (!isValidSound(definitionSound)) {
      setDefinitionSoundError("聲音格式錯誤");
      return;
    }

    if (handleWordToAdd !== undefined) {
      handleWordToAdd(
        vocabulary,
        definition,
        isModalOpen,
        vocabularySound,
        definitionSound,
      );
    }
    if (handleAddWord !== undefined) {
      console.log(
        vocabulary,
        definition,
        isModalOpen,
        vocabularySound,
        definitionSound,
      );
      handleAddWord(
        vocabulary,
        definition,
        isModalOpen,
        vocabularySound,
        definitionSound,
      );
    }
    handleClose();
  };

  const handleClose = () => {
    setVocabulary("");
    setDefinition("");
    setVocabularyError("");
    setDefinitionError("");
    setVocabularySoundError("");
    setDefinitionSoundError("");
    setIsModalOpen(-1);
  };

  return (
    <>
      {/* overlay */}
      <div
        onClick={() => handleClose()}
        className={`${isModalOpen !== -1 ? "block" : "hidden"} fixed inset-0 z-1000 bg-black opacity-30`}
      ></div>

      {/* modal */}
      <div
        className={`${isModalOpen !== -1 ? "visible top-[50%] opacity-100" : "invisible top-[40%] opacity-0"} fixed left-[50%] z-1000 flex h-[350px] w-[90%] max-w-[380px] translate-x-[-50%] translate-y-[-50%] flex-col gap-4 rounded-2xl bg-white p-8 transition-all duration-300 sm:h-[450px] sm:max-w-[630px] sm:p-12 lg:h-[480px] lg:max-w-[800px]`}
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
          {"新增單詞"}
        </h1>
        <div className="flex flex-col gap-[40px] md:gap-[80px]">
          <div className="group w-full">
            <textarea
              placeholder={"輸入單字"}
              value={vocabulary}
              onChange={(e) => {
                setVocabulary(e.target.value);
                setVocabularyError("");
              }}
              className="mt-1 w-full resize-none text-xl leading-none break-words outline-none sm:text-2xl"
            ></textarea>

            <div
              className={`${vocabularyError !== "" || vocabularySoundError !== "" ? "bg-red-500 after:block" : "after:hidden"} relative mt-[-10px] h-[5px] w-full bg-black transition-colors group-focus-within:bg-amber-300 after:absolute after:top-full after:content-['']`}
            ></div>
            <div className="flex w-full items-center justify-between text-[.8rem] md:text-[1rem]">
              <span>
                {vocabularyError === "" && vocabularySoundError === "" ? (
                  <>單字 {vocabulary.length}/ 100</> // Fragment to avoid extra span
                ) : vocabularyError !== "" ? (
                  vocabularyError
                ) : (
                  vocabularySoundError
                )}
              </span>

              <select
                className="text-[var(--light-theme-color)]"
                value={vocabularySound}
                onChange={(e) => {
                  setVocabularySound(e.target.value);
                  setVocabularySoundError("");
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
          <div className="group w-full">
            <textarea
              placeholder={"輸入註釋"}
              value={definition}
              onChange={(e) => {
                setDefinition(e.target.value);
                setDefinitionError("");
              }}
              className="mt-1 w-full resize-none text-xl leading-none break-words outline-none sm:text-2xl"
            ></textarea>
            <div
              className={`${definitionError !== "" || definitionSoundError !== "" ? "bg-red-500 after:block" : "after:hidden"} relative mt-[-10px] h-[5px] w-full bg-black transition-colors group-focus-within:bg-amber-300 after:absolute after:top-full after:content-['']`}
            ></div>
            <div className="flex w-full items-center justify-between text-[.8rem] md:text-[1rem]">
              <span>
                {definitionError === "" && definitionSoundError === "" ? (
                  <>註釋 {definition.length}/ 300</> // Fragment to avoid extra span
                ) : definitionError !== "" ? (
                  definitionError
                ) : (
                  definitionSoundError
                )}
              </span>

              <select
                className="text-[var(--light-theme-color)]"
                value={definitionSound}
                onChange={(e) => {
                  setDefinitionSound(e.target.value);
                  setDefinitionSoundError("");
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
            onClick={() => {
              handleClose();
            }}
            className="rounded-xl p-2 font-bold text-[var(--light-theme-color)] hover:cursor-pointer hover:bg-gray-200 sm:p-3 sm:text-2xl"
          >
            取消
          </button>
          <button
            onClick={() => handleConfirm()}
            className="rounded-xl bg-[var(--light-theme-color)] p-2 font-bold text-white hover:cursor-pointer hover:bg-blue-700 sm:p-3 sm:text-2xl"
          >
            確認
          </button>
        </div>
      </div>
    </>
  );
}
