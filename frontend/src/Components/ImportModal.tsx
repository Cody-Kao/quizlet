import { useCallback, useState } from "react";
import ConfirmModal from "./ConfirmModal";
import React from "react";
import { soundArray } from "../Consts/consts";
import { ImportWord } from "../Types/types";

export interface ImportModalProps {
  totalWords: number;
  isModalOpen: boolean;
  handleClose: () => void;
  handleImport: (
    newWords: ImportWord[],
    vocabularySound: string,
    definitionSound: string,
    insertIndex: number,
  ) => boolean;
}

export default React.memo(function ImportModal(props: ImportModalProps) {
  const { totalWords, isModalOpen, handleClose, handleImport } = props;
  const [voDelimiter, setVoDelimiter] = useState<string>(`\u0020\u0020`);
  const [defaultCustomForVo, setDefaultCustomForVo] = useState(""); // 讓自訂分隔可以被正確選到所加的額外state
  const voData = [
    { value: "\u0020\u0020", label: "兩個空格" },
    { value: `,`, label: "一個逗號" },
    { value: defaultCustomForVo, label: "自訂" },
  ];
  const [wordDelimiter, setWordDelimiter] = useState<string>(`\n`);
  const [defaultCustomForWord, setDefaultCustomForWord] = useState(""); // 讓自訂分隔可以被正確選到所加的額外state
  const wordData = [
    { value: "\n", label: "新的一行" },
    { value: `;`, label: "一個分號" },
    { value: defaultCustomForWord, label: "自訂" },
  ];
  const placeHolderText = `單字1#註釋1##單字2#註釋2##單字3#註釋3`;
  let placeHolder = "";
  if (voDelimiter !== "" && wordDelimiter !== "") {
    placeHolder = placeHolderText
      .replace(/##/g, "__WORD__") // step 1: temp placeholder
      .replace(/#/g, voDelimiter) // step 2: single #
      .replace(/__WORD__/g, wordDelimiter); // step 3: restore double ##
  }
  const [inputWords, setInputWords] = useState("");

  const preview: ImportWord[] = [];
  if (voDelimiter !== "" && wordDelimiter !== "") {
    const words = inputWords.split(wordDelimiter);
    for (const word of words) {
      if (word.trim() === "") continue;
      const index = word.indexOf(voDelimiter);
      const [v, d] =
        index === -1
          ? [word, ""]
          : [word.slice(0, index), word.slice(index + voDelimiter.length)];
      const w: ImportWord = {
        vocabulary: v.replace(/\t/g, "    ") || "",
        definition: d.replace(/\t/g, "    ") || "",
      };
      preview.push(w);
    }
  }
  const [vocabularySound, setVocabularySound] = useState("en-US");
  const [definitionSound, setDefinitionSound] = useState("zh-TW");

  const [modalDescription, setModalDescription] = useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [callback, setCallback] = useState<() => void>(() => {});
  const [insertIndex, setInsertIndex] = useState(0);

  const cleanUp = useCallback(() => {
    setVoDelimiter(`\u0020\u0020`);
    setDefaultCustomForVo("");
    setWordDelimiter(`\n`);
    setDefaultCustomForWord("");
    setInputWords("");
    setVocabularySound("en-US");
    setDefinitionSound("zh-TW");
    setInsertIndex(0);
  }, []);
  return (
    <>
      <ConfirmModal
        description={modalDescription}
        isModalOpen={isConfirmModalOpen}
        setIsModalOpen={setIsConfirmModalOpen}
        callback={callback}
      />
      <div
        className={`${isModalOpen ? "visible top-0 opacity-100" : "invisible top-[-30%] opacity-0"} fixed inset-0 z-1000 flex h-full w-full flex-col bg-white px-[1rem] transition-all duration-400 ease-in-out sm:px-[2rem]`}
      >
        <header className="flex w-full flex-col items-start pt-[1rem] pb-[.5rem] text-[.8rem] sm:flex-row sm:items-center sm:text-[1rem]">
          <div className="flex w-full items-center">
            <h2 className="text-black">
              <span className="font-bold">匯入你的數據</span>
              <span className="hidden lg:inline">
                (可從Word、Excel、Google文件等複製)並在此貼上
              </span>
            </h2>
            <span className="ml-[2%] hidden self-center sm:inline md:ml-[5%]">
              從第
              <input
                value={insertIndex}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    setInsertIndex(0);
                    return;
                  }
                  const index = parseInt(value, 10);
                  if (isNaN(index)) return; // not a number, do nothing
                  if (index < 0) return; // block all negative numbers
                  if (index > totalWords) return; // block too large numbers
                  setInsertIndex(index);
                }}
                type="text"
                className="w-[3rem] rounded-lg bg-gray-200 px-1 outline-none"
              />
              個字後插入(0為開頭;&nbsp;{`${totalWords}`}為最後一個字)
            </span>
            <button
              onClick={handleClose}
              className="ml-auto text-[1.5rem] font-bold text-black hover:cursor-pointer"
            >
              &#10005;
            </button>
          </div>
          <span className="sm:hidden md:ml-[5%]">
            從第
            <input
              type="text"
              className="w-[3rem] rounded-lg bg-gray-200 px-1 outline-none"
            />
            個字後插入(0為開頭;-1為最後一個字)
          </span>
        </header>
        <textarea
          placeholder={placeHolder}
          value={inputWords}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault(); // prevent moving focus
              const target = e.target as HTMLInputElement;
              const start = target.selectionStart ?? 0;
              const end = target.selectionEnd ?? 0;
              const value = inputWords;
              setInputWords(
                value.substring(0, start) + "\t" + value.substring(end),
              );
              // move cursor after inserted \t
              setTimeout(() => {
                (e.target as HTMLTextAreaElement).selectionStart = (
                  e.target as HTMLTextAreaElement
                ).selectionEnd = start + 1;
              }, 0);
            }
          }}
          onChange={(e) => {
            console.log(e.target.value);
            setInputWords(e.target.value);
          }}
          className="h-[30%] max-h-[450px] w-full overflow-y-auto p-[1rem] outline-1 outline-black focus:outline-3 focus:outline-[var(--light-theme-color)] md:text-[1.2rem]"
        />

        <div className="flex w-full justify-between py-2 sm:justify-start sm:gap-[2rem]">
          <div className="flex flex-col items-start gap-4">
            <h3 className="font-bold text-black md:text-[1.2rem]">
              單字跟註釋之間
            </h3>
            {voData.map((data, index) => (
              <div
                key={`voData-${index}`}
                className="flex w-full items-center gap-2 md:text-[1.1rem]"
              >
                <input
                  onChange={() => setVoDelimiter(data.value)}
                  checked={voDelimiter === data.value}
                  name="voData-radio"
                  type="radio"
                  id={`voData-radio-${index}`}
                  className="accent-black hover:cursor-pointer"
                />
                <label
                  htmlFor={`voData-radio-${index}`}
                  className="font-bold hover:cursor-pointer"
                >
                  {data.label !== "自訂" ? (
                    data.label
                  ) : (
                    <div className="relative h-[3rem] w-[6.5rem] sm:h-[3.5rem] sm:w-[8rem] md:w-[12rem]">
                      <input
                        type="text"
                        id={`voData-custom-${index}`}
                        placeholder=" "
                        className="peer h-full w-full rounded-lg bg-gray-100 px-2 pt-5 text-sm outline-none"
                        onFocus={() => setVoDelimiter(data.value)}
                        onChange={(e) => {
                          if (e.target.value.includes("#")) return;
                          setDefaultCustomForVo(e.target.value);
                          setVoDelimiter(e.target.value);
                        }}
                        value={defaultCustomForVo}
                        // 處理輸入Tab，因為在input按tab其實是會跳出輸入框的，所以要特別處理
                        onKeyDown={(e) => {
                          if (e.key === "Tab") {
                            e.preventDefault(); // Prevent default tab behavior
                            const target = e.target as HTMLInputElement;
                            const start = target.selectionStart ?? 0;
                            const end = target.selectionEnd ?? 0;

                            const newValue =
                              defaultCustomForVo.slice(0, start) +
                              "\t" +
                              defaultCustomForVo.slice(end);
                            setVoDelimiter(newValue);
                            setDefaultCustomForVo(newValue);

                            // Move cursor after the inserted tab
                            requestAnimationFrame(() => {
                              target.selectionStart = target.selectionEnd =
                                start + 1;
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={`voData-radio-${index}`}
                        className="pointer-events-none absolute top-2 left-2 text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-[.8rem] peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-[12px] peer-focus:text-gray-500"
                      >
                        {data.label}(不包含#)
                      </label>
                    </div>
                  )}
                </label>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-start gap-4">
            <h3 className="font-bold text-black md:text-[1.2rem]">
              字卡跟字卡之間
            </h3>
            {wordData.map((data, index) => (
              <div
                key={`wordData-${index}`}
                className="flex w-full items-center gap-2 md:text-[1.1rem]"
              >
                <input
                  onChange={() => setWordDelimiter(data.value)}
                  checked={wordDelimiter === data.value}
                  name="wordData-radio"
                  type="radio"
                  id={`wordData-radio-${index}`}
                  className="accent-black hover:cursor-pointer"
                />
                <label
                  htmlFor={`wordData-radio-${index}`}
                  className="font-bold hover:cursor-pointer"
                >
                  {data.label !== "自訂" ? (
                    data.label
                  ) : (
                    <div className="relative h-[3rem] w-[6.5rem] sm:h-[3.5rem] sm:w-[8rem] md:w-[12rem]">
                      <input
                        type="text"
                        id={`wordData-custom-${index}`}
                        placeholder=" "
                        className="peer h-full w-full rounded-lg bg-gray-100 px-2 pt-5 text-sm outline-none"
                        onFocus={() => setWordDelimiter(data.value)}
                        onChange={(e) => {
                          if (e.target.value.includes("#")) return;
                          setDefaultCustomForWord(e.target.value);
                          setWordDelimiter(e.target.value);
                        }}
                        value={defaultCustomForWord}
                        // 處理輸入Tab，因為在input按tab其實是會跳出輸入框的，所以要特別處理
                        onKeyDown={(e) => {
                          if (e.key === "Tab") {
                            e.preventDefault(); // Prevent default tab behavior
                            const target = e.target as HTMLInputElement;
                            const start = target.selectionStart ?? 0;
                            const end = target.selectionEnd ?? 0;

                            const newValue =
                              defaultCustomForWord.slice(0, start) +
                              "\t" +
                              defaultCustomForWord.slice(end);
                            setWordDelimiter(newValue);
                            setDefaultCustomForWord(newValue);

                            // Move cursor after the inserted tab
                            requestAnimationFrame(() => {
                              target.selectionStart = target.selectionEnd =
                                start + 1;
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={`wordData-radio-${index}`}
                        className="pointer-events-none absolute top-2 left-2 text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-[.8rem] peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-[12px] peer-focus:text-gray-500"
                      >
                        {data.label}(不包含#)
                      </label>
                    </div>
                  )}
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-6">
          <h2 className="text-[1rem] font-bold text-black md:text-[1.2rem]">
            預覽
          </h2>
          <div className="text-[.8rem] sm:text-[1rem]">
            <span>單字發音:</span>
            <select
              value={vocabularySound}
              onChange={(e) => setVocabularySound(e.target.value)}
              id="vocabularySound"
              className="font-bold text-black"
            >
              {soundArray.map((sound, index) => (
                <option key={`vocabularySound-${index}`} value={sound.EngName}>
                  {sound.TwName}
                </option>
              ))}
            </select>
          </div>
          <div className="text-[.8rem] sm:text-[1rem]">
            <span>註釋發音:</span>
            <select
              id="definitionSound"
              value={definitionSound}
              onChange={(e) => setDefinitionSound(e.target.value)}
              className="font-bold text-black"
            >
              {soundArray.map((sound, index) => (
                <option key={`definitionSound-${index}`} value={sound.EngName}>
                  {sound.TwName}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* 讓\n能正確在html顯示 => whitespace-pre-wrap */}
        {/* 讓\t能正確在html顯示則是把\t換成四個\s再搭配whitespace-pre-wrap */}
        <div className="flex w-full flex-1 flex-col overflow-hidden rounded-lg whitespace-pre-wrap">
          <div className="flex w-full flex-grow flex-col gap-2 overflow-y-auto bg-gray-100 p-2">
            {preview.map((word, index) => (
              <div
                key={index}
                className="flex h-max w-full gap-4 rounded-lg bg-white px-2 py-4"
              >
                <div className="relative flex-2/6 after:absolute after:top-[50%] after:right-0 after:h-[90%] after:w-[1px] after:translate-y-[-50%] after:bg-gray-300 after:content-['']">
                  {word.vocabulary}
                </div>
                <div className="flex-4/6">{word.definition}</div>
              </div>
            ))}
          </div>
        </div>
        <footer className="mt-auto flex w-full items-center justify-end gap-4 py-[.8rem]">
          <button
            onClick={() => {
              setModalDescription("確定清除更新並退出嗎? 此項操作無法復原");
              setCallback(() => () => {
                cleanUp();
                handleClose();
              });
              setIsConfirmModalOpen(true);
            }}
            className="rounded-lg border-2 border-gray-200 px-2 py-2 text-[.8rem] font-bold text-black transition-all duration-200 hover:cursor-pointer hover:bg-gray-300 sm:px-4 sm:text-[1rem]"
          >
            取消
          </button>
          <button
            onClick={() => {
              setModalDescription("確定匯入至單字集?");
              setCallback(() => () => {
                if (
                  !handleImport(
                    preview,
                    vocabularySound,
                    definitionSound,
                    insertIndex,
                  )
                ) {
                  return;
                }
                cleanUp();
                handleClose();
              });
              setIsConfirmModalOpen(true);
            }}
            className="rounded-lg border-2 border-gray-200 bg-[var(--light-theme-color)] px-2 py-2 text-[.8rem] font-bold text-white transition-all duration-200 hover:cursor-pointer hover:bg-blue-700 sm:px-4 sm:text-[1rem]"
          >
            匯入
          </button>
        </footer>
      </div>
    </>
  );
});
