import { useEffect, useState } from "react";
import { textCount } from "../Utils/utils";
import { useLocalStorage } from "../Hooks/useLocalStorage";
import ConfirmModal from "./ConfirmModal";
import { useNavigate } from "react-router";
import { NoticeDisplay } from "../Types/types";
import { postRequest } from "../Utils/postRequest";
import { PATH } from "../Consts/consts";
import { CreateFeedbackRequest } from "../Types/request";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";

export default function CreateFeedback() {
  const { user } = useLogInContextProvider();

  useEffect(() => {
    if (user === null) {
      navigate("/");
    }
  }, [user]);

  const { setNotice } = useNoticeDisplayContextProvider();
  const navigate = useNavigate();
  // confirm modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  // 處理標題
  const [title, setTitle, removeTitle] = useLocalStorage("title", "");
  // 單字集敘述
  const [content, setContent, removeContent] = useLocalStorage("content", "");
  // 處理標題、單字集敘述字數錯誤
  const [titleError, setTitleError] = useState<string>("");
  const [contentError, setContentError] = useState<string>("");

  // 處理保存送出
  const handleSentConfirm = () => {
    if (title.trim().length === 0) {
      setTitleError("標題不得為空");
      return;
    }
    if (title.length > 50) {
      setTitleError("標題不得超過50字元");
      return;
    }
    if (content.length > 300) {
      setContentError("單字集敘述不得超過300字元");
      return;
    }

    postRequest(`${PATH}/createFeedback`, {
      authorID: user?.id || "",
      title: title,
      content: content,
    } as CreateFeedbackRequest)
      .then(() => {
        // clean up the localStorage for future use
        cleanUp();
        setTimeout(() => {
          setNotice({
            type: "Success",
            payload: { message: "回饋成功! 感謝您💗" },
          });
          navigate(`/`, { replace: false });
        }, 200);
      })
      .catch((error) => {
        setNotice(error as NoticeDisplay);
      });
  };

  const cleanUp = () => {
    removeTitle();
    removeContent();
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
      <ConfirmModal
        description={modalDescription}
        isModalOpen={isConfirmModalOpen}
        setIsModalOpen={setIsConfirmModalOpen}
        callback={callback}
      />

      <div className="flex h-full w-full flex-col gap-4 bg-gray-100 px-[5%] py-[2rem] lg:pr-[10%] lg:pl-[5%]">
        <h1 className="text-[1.5rem] font-bold text-black md:text-[2rem]">
          建議與回饋
        </h1>
        <span>#一切都會以匿名方式進行</span>
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
          <div className="flex w-full flex-col gap-2 rounded-lg bg-white px-4 py-2 text-black">
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
              className="w-full font-bold outline-none focus:border-b-2 focus:border-amber-300 md:text-[1.2rem]"
            />
            {titleError === "" ? (
              <span className="pt-2 text-[.8rem] font-light md:text-[1rem]">
                標題字數&nbsp;{textCount(title)}/50
              </span>
            ) : (
              <span className="pt-2 text-[.8rem] font-light text-red-500">
                {titleError}
              </span>
            )}
          </div>
          <div className="flex w-full flex-col gap-2 rounded-lg bg-white px-4 py-2 text-black">
            <textarea
              value={content}
              onChange={(e) => {
                const text = e.target.value;
                if (textCount(text) > 300) return;
                setContentError("");
                setContent(text);
              }}
              placeholder="任何想說的話"
              className="w-full resize-none font-bold outline-none focus:border-b-2 focus:border-amber-300 md:text-[1.2rem]"
            />
            {contentError === "" ? (
              <span className="pt-2 text-[.8rem] font-light md:text-[1rem]">
                內容字數&nbsp;{textCount(content)}/300
              </span>
            ) : (
              <span className="pt-2 text-[.8rem] font-light text-red-500">
                {contentError}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
