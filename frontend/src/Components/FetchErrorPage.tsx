import { useAsyncError, useNavigate } from "react-router";
import { NoticeDisplay } from "../Types/types";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { v4 as uuid } from "uuid";
import { postRequest } from "../Utils/postRequest";
import { PATH } from "../Consts/consts";
import { formatTimeToSeconds } from "../Utils/utils";
import { LogErrorRequest } from "../Types/request";

export default function FetchErrorPage() {
  const navigate = useNavigate();
  const error = useAsyncError() as NoticeDisplay | null;
  const { user } = useLogInContextProvider();
  const errorID = uuid();

  // Provide a safe fallback in case error is undefined or has no payload
  const safeError =
    error && error.payload
      ? error
      : {
          type: "Error",
          payload: { statusCode: 403, message: "使用者無權限請求" },
        };
  const log = async () => {
    await postRequest(`${PATH}/logError`, {
      userID: user?.id || "未登入使用者",
      errorID: errorID,
      error: safeError.payload.message,
      errorInfo:
        "Error from FetchErrorPage\n主要是用來記錄使用者情況，而非必須處理性的錯誤",
      time: formatTimeToSeconds(Math.floor(Date.now() / 1000)),
    } as LogErrorRequest);
  };
  log();
  return (
    <div className="flex h-full w-full flex-col items-center bg-gray-100 p-6 text-center sm:justify-start">
      <img
        className="object-fit h-[30%] w-full sm:h-[40%] md:h-[20%]"
        src="/image/notFoundEmoji.svg"
        alt="Not Found Emoji"
      />
      <p className="text-6xl">
        {"statusCode" in safeError.payload ? safeError.payload.statusCode : ""}
      </p>
      <p className="text-4xl">{safeError.payload.message}</p>
      <br />

      <p className="text-xl sm:text-2xl">
        Here is the Link to retry&nbsp;
        <button
          onClick={() => navigate(0)}
          className="text-[var(--light-theme-color)] hover:cursor-pointer hover:underline"
        >
          RETRY!
        </button>
      </p>
    </div>
  );
}
