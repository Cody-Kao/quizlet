import { MailViewType, NoticeDisplay } from "../Types/types";
import UserLink from "./UserLink";
import { ADMIN, PATH } from "../Consts/consts";
import DefaultMailFooter from "./DefaultMailFooter";
import { formatTime } from "../Utils/utils";
import { useEffect, useState } from "react";
import { postRequest } from "../Utils/postRequest";
import { ReadMailRequest } from "../Types/request";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";

export default function MailModal({
  mail,
  isMailModalOpen,
  setIsMailModalOpen,
}: {
  mail: MailViewType;
  isMailModalOpen: boolean;
  setIsMailModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { user, setUnreadMails } = useLogInContextProvider();
  const { setNotice } = useNoticeDisplayContextProvider();
  const [isVisible, setIsVisible] = useState(isMailModalOpen);

  useEffect(() => {
    if (isMailModalOpen) {
      // If the modal is opening, make it visible and apply the transition
      setIsVisible(true);
      // 送出已讀
      if (mail.read === false) {
        postRequest(`${PATH}/readMail`, {
          userID: user?.id,
          mailID: mail.id,
        } as ReadMailRequest)
          .then(() => {
            setUnreadMails((prev) => Math.max(prev - 1, 0));
          })
          .catch((error) => setNotice(error as NoticeDisplay));
      }
    } else {
      // If the modal is closing, wait for the transition before removing it
      setTimeout(() => {
        setIsVisible(false);
      }, 300); // Adjust time to match your transition duration (200ms)
    }
  }, [isMailModalOpen]);

  return (
    <>
      {isVisible && (
        <div
          className={`fixed top-[50%] left-[50%] z-600 h-[80vh] max-h-[600px] min-h-[500px] w-[80%] max-w-[620px] translate-x-[-50%] translate-y-[-50%] rounded-xl bg-[#fff] p-[1rem] pb-[2rem] transition-all duration-200 sm:p-[4rem] sm:pr-[2rem] ${
            isMailModalOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        >
          {/* cross button */}
          <button
            onClick={() => setIsMailModalOpen(false)}
            className="absolute top-[.5rem] right-5 h-[2rem] w-[2rem] text-lg hover:cursor-pointer sm:top-[1rem] sm:text-2xl"
          >
            &#x2716;
          </button>
          {/* mail content */}
          <div className="flex h-full flex-col overflow-y-scroll py-2 pr-3">
            <div className="mb-[1.5rem] flex w-full flex-wrap items-baseline justify-between">
              <h1 className="max-w-[75%] text-[1.6rem] font-bold break-words sm:text-[2rem]">
                {mail?.title}
              </h1>
              <span className="font-bold">
                {formatTime(mail?.date || 1000000000)}
              </span>
            </div>

            <p
              className="mb-[1rem] text-[.9rem] leading-9 sm:text-[1.2rem]"
              dangerouslySetInnerHTML={{
                __html: mail.content,
              }}
            ></p>
            <div className="mt-auto text-gray-700">
              <div className="mb-[2rem] h-[2px] w-full bg-gray-300"></div>
              <div className="text-[.8rem] leading-8 sm:text-[1rem]">
                <DefaultMailFooter />

                <div className="flex items-center">
                  <span>寄件者:&nbsp;</span>
                  <UserLink userID={ADMIN.id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
