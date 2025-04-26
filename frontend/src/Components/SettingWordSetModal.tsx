import { useEffect, useState } from "react";
import { postRequest } from "../Utils/postRequest";
import { PATH } from "../Consts/consts";
import {
  ToggleAllowCopyRequest,
  ToggleIsPublicRequest,
} from "../Types/request";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";
import React from "react";

export default React.memo(function SettingWordSetModal({
  handleToggleAllowCopy,
  handleToggleIsPublic,
  userID,
  wordSetID,
  isModalOpen,
  handleClose,
  allowCopy,
  isPublic,
}: {
  handleToggleAllowCopy?: () => void;
  handleToggleIsPublic?: () => void;
  userID?: string;
  wordSetID?: string;
  isModalOpen: boolean;
  handleClose: () => void;
  allowCopy: boolean;
  isPublic: boolean;
}) {
  const { setNotice } = useNoticeDisplayContextProvider();
  const [isAllowCopy, setIsAllowCopy] = useState(allowCopy);
  const [isAllowCopyLoading, setIsAllowCopyLoading] = useState(false);
  useEffect(() => {
    setIsAllowCopy(allowCopy);
  }, [allowCopy]);

  const [isPub, setIsPub] = useState(isPublic);
  const [isPubLoading, setIsPubLoading] = useState(false);
  useEffect(() => {
    setIsPub(isPublic);
  }, [isPublic]);

  const toggleAllowCopy =
    handleToggleAllowCopy === undefined
      ? () => {
          setIsAllowCopyLoading(true);
          postRequest(`${PATH}/toggleAllowCopy`, {
            userID: userID,
            wordSetID: wordSetID,
          } as ToggleAllowCopyRequest)
            .then(() => {
              setIsAllowCopy((prev) => !prev);
            })
            .catch((error) => {
              setNotice(error);
            })
            .finally(() => {
              setIsAllowCopyLoading(false);
            });
        }
      : handleToggleAllowCopy;
  const toggleIsPublic =
    handleToggleIsPublic === undefined
      ? () => {
          setIsPubLoading(true);
          postRequest(`${PATH}/toggleIsPublic`, {
            userID: userID,
            wordSetID: wordSetID,
          } as ToggleIsPublicRequest)
            .then(() => {
              setIsPub((prev) => !prev);
            })
            .catch((error) => {
              setNotice(error);
            })
            .finally(() => {
              setIsPubLoading(false);
            });
        }
      : handleToggleIsPublic;

  return (
    <>
      <div
        onClick={() => handleClose()}
        className={`${isModalOpen ? "block" : "hidden"} fixed inset-0 z-1000 bg-black opacity-30`}
      ></div>
      <div
        className={`${isModalOpen ? "visible top-[50%] opacity-100" : "invisible top-[40%] opacity-0"} fixed left-[50%] z-1000 flex h-max w-[90%] translate-x-[-50%] translate-y-[-50%] flex-col gap-6 rounded-2xl bg-white p-4 transition-all duration-300 sm:w-[55%] sm:p-8 xl:w-[35%]`}
      >
        <span
          onClick={() => handleClose()}
          className="absolute top-[12px] right-[15px] text-[1.2rem] font-bold text-black hover:cursor-pointer"
        >
          &#10005;
        </span>
        <h1 className="text-[1.2rem] font-bold text-black sm:text-[2rem]">
          設定
        </h1>
        <div
          className={`flex items-center justify-between lg:text-[1.2rem] ${isAllowCopy === undefined ? "opacity-50" : ""}`}
        >
          <span>允許他人複製該單字集</span>
          <label
            htmlFor="isAllowCopyToggle"
            className={`relative inline-block h-6 w-10 rounded-full transition-colors duration-300 ease-in-out lg:h-8 lg:w-14 ${isAllowCopyLoading ? "pointer-events-none opacity-50" : ""} ${isAllowCopy ? "bg-[var(--light-theme-color)]" : "bg-gray-400"} ${isAllowCopy === undefined ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
          >
            <input
              type="checkbox"
              id="isAllowCopyToggle"
              className="sr-only"
              checked={isAllowCopy}
              onChange={() => toggleAllowCopy()}
            />
            <span
              className={`absolute top-1 left-1 h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 lg:h-6 lg:w-6 ${isAllowCopy ? "translate-x-4 lg:translate-x-6" : "translate-x-0"}`}
            ></span>
          </label>
        </div>

        <div
          className={`flex items-center justify-between lg:text-[1.2rem] ${isPub === undefined ? "opacity-50" : ""}`}
        >
          <span>允許發布至首頁(最新/熱門單字集)</span>
          <label
            htmlFor="isPubToggle"
            className={`relative inline-block h-6 w-10 rounded-full transition-colors duration-300 ease-in-out lg:h-8 lg:w-14 ${isPubLoading ? "pointer-events-none opacity-50" : ""} ${isPub ? "bg-[var(--light-theme-color)]" : "bg-gray-400"} ${isPub === undefined ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
          >
            <input
              type="checkbox"
              id="isPubToggle"
              className="sr-only"
              checked={isPub}
              onChange={() => toggleIsPublic()}
            />
            <span
              className={`absolute top-1 left-1 h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 lg:h-6 lg:w-6 ${isPub ? "translate-x-4 lg:translate-x-6" : "translate-x-0"}`}
            ></span>
          </label>
        </div>
      </div>
    </>
  );
});
