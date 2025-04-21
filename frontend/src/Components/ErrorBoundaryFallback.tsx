import { FallbackProps } from "react-error-boundary";
import { v4 as uuid } from "uuid";
import { postRequest } from "../Utils/postRequest";
import { PATH } from "../Consts/consts";
import { formatTimeToSeconds } from "../Utils/utils";
import { LogErrorRequest } from "../Types/request";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { useEffect, useMemo } from "react";
export default function ErrorBoundaryFallback({ error }: FallbackProps) {
  const { user } = useLogInContextProvider();
  const errorID = useMemo(() => {
    return uuid();
  }, []);
  let errorMsg = "default error message: something went wrong";
  let errorInfo = "default error message: something went wrong";
  if (typeof error === "object") {
    if ("payload" in error && "message" in error.payload) {
      errorMsg = error.payload.message;
    } else if ("message" in error) {
      errorMsg = error.message;
      errorInfo = error.name + "\n" + (error.stack || "");
    }
  }
  const log = async () => {
    await postRequest(`${PATH}/logError`, {
      userID: user?.id || "",
      errorID: errorID,
      error: errorMsg,
      errorInfo: errorInfo,
      time: formatTimeToSeconds(Math.floor(Date.now() / 1000)),
    } as LogErrorRequest);
  };
  // 確保同樣層級的log只觸發一次，不會因為使用者點擊到routing就再打一次log
  useEffect(() => {
    log();
  }, []);
  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-100">
      <div className="flex h-full w-full flex-col flex-wrap items-center justify-center gap-2 text-center">
        <h1 className="text-2xl">{errorMsg}</h1>
        <h2 className="text-xl">錯誤代碼:&nbsp;{errorID}</h2>
        <span className="text-xl">
          請將整個頁面截圖後寄信至:&nbsp;
          <span className="text-[var(--light-theme-color)]">
            gg1671821@gmail.com
          </span>
        </span>
      </div>
    </div>
  );
}
