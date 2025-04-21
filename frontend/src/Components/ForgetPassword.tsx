import { FaRegUser } from "react-icons/fa6";
import { CiLock } from "react-icons/ci";
import { IoKeyOutline } from "react-icons/io5";
import { useEffect, useState } from "react";
import { isValidEmail, isValidPassword } from "../Utils/utils";
import { postRequest } from "../Utils/postRequest";
import {
  RequestValidateCodeRequest,
  ResetPasswordRequest,
} from "../Types/request";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { NoticeDisplay } from "../Types/types";
import { PATH, resendValidateCodeTime } from "../Consts/consts";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";
import { useNavigate } from "react-router";
import { useLocalStorage } from "../Hooks/useLocalStorage";

export default function ForgetPassword() {
  const { isLogIn } = useLogInContextProvider();
  const { setNotice } = useNoticeDisplayContextProvider();
  const navigate = useNavigate();

  const [isSendingRequestLoading, setIsSendingRequestLoading] = useState(false); // 確認送出更改密碼
  const [account, setAccount] = useState<string>("");
  const [validateCode, setValidateCode] = useState<string>("");
  const [isSendValidateCodeLoading, setIsSendValidateCodeLoading] =
    useState(false);
  const [nextSendTime, setNextSendTime, removeNextSendTime] =
    useLocalStorage<number>("nextSendTime", 0); // 到期時間
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [password, setPassword] = useState<string>("");
  const [rePassword, setRePassword] = useState<string>("");

  const [accountError, setAccountError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [rePasswordError, setRePasswordError] = useState<string>("");

  // 處理帳號檢查
  const checkAccount = (): boolean => {
    const userAccount = account.trim();
    if (userAccount.length === 0) {
      setAccountError("帳號不得為空");
      return false;
    }
    if (!isValidEmail(userAccount)) {
      setAccountError("電子郵件格式錯誤");
      return false;
    }
    return true;
  };
  // 處理密碼檢查
  const checkPassword = (): boolean => {
    const userPassword = password.trim();
    if (userPassword.length < 8 || userPassword.length > 20) {
      setPasswordError("密碼長度為8至20字元");
      console.log(userPassword);
      return false;
    }
    // Check if the password contains spaces
    if (/\s/.test(password)) {
      setPasswordError("密碼不得包含空格");
      return false;
    }

    if (!isValidPassword(userPassword)) {
      setPasswordError("密碼至少包含一個大寫、小寫、數字");
      return false;
    }

    if (!/[@$!%*?&]/.test(userPassword)) {
      setPasswordError("密碼必須包含一個特殊字元(@$!%*?&)");
      return false;
    }
    if (!/^[A-Za-z\d@$!%*?&]+$/.test(userPassword)) {
      setPasswordError("密碼含有非法字元");
      return false;
    }
    return true;
  };
  // 處理Re密碼檢查
  const checkRePassword = (): boolean => {
    const userRePassword = rePassword.trim();
    if (userRePassword.length < 8 || userRePassword.length > 20) {
      setRePasswordError("確認密碼長度為8至20字元");
      console.log(userRePassword);
      return false;
    }
    // Check if the password contains spaces
    if (/\s/.test(rePassword)) {
      setRePasswordError("確認密碼不得包含空格");
      return false;
    }

    if (!isValidPassword(userRePassword)) {
      setRePasswordError("確認密碼至少包含一個大寫、小寫、數字");
      return false;
    }

    if (!/[@$!%*?&]/.test(userRePassword)) {
      setPasswordError("確認密碼必須包含一個特殊字元(@$!%*?&)");
      return false;
    }
    if (!/^[A-Za-z\d@$!%*?&]+$/.test(userRePassword)) {
      setPasswordError("確認密碼含有非法字元");
      return false;
    }

    const userPassword = password.trim();
    if (userPassword !== userRePassword) {
      setRePasswordError("兩次密碼輸入不相符");
      return false;
    }
    return true;
  };

  // 處理驗證碼寄送
  const handleSendValidateCode = () => {
    if (isSendingRequestLoading || isSendValidateCodeLoading || timeLeft > 0)
      return;
    if (!checkAccount) {
      return;
    }
    setAccountError("");
    setIsSendValidateCodeLoading(true);
    postRequest(`${PATH}/requestValidateCode/?changeMode=password`, {
      email: account,
    } as RequestValidateCodeRequest)
      .then(() => {
        setNextSendTime(Date.now() + resendValidateCodeTime);
        setNotice({
          type: "Success",
          payload: { message: "驗證碼已寄出!" },
        } as NoticeDisplay);
      })
      .catch((error) => {
        setNotice(error as NoticeDisplay);
      })
      .finally(() => {
        setIsSendValidateCodeLoading(false);
      });
  };

  // 處理更改密碼
  const handleChangePassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!checkAccount()) {
      return;
    }
    setAccountError("");

    if (!checkPassword()) {
      return;
    }
    setPasswordError("");

    if (!checkRePassword()) {
      return;
    }
    setRePasswordError("");
    // sending request
    setIsSendingRequestLoading(true);
    postRequest(`${PATH}/resetPassword`, {
      email: account,
      validateCode: validateCode,
      password: password,
      rePassword: rePassword,
    } as ResetPasswordRequest)
      .then(() => {
        navigate("/toLogIn");
        setTimeout(() => {
          setNotice({
            type: "Success",
            payload: { message: "更改密碼成功!" },
          } as NoticeDisplay);
        }, 200);
      })
      .catch((error) => {
        console.log(error);
        setNotice(error as NoticeDisplay);
      })
      .finally(() => {
        setIsSendingRequestLoading(false);
      });
  };

  useEffect(() => {
    if (isLogIn) {
      alert("您已是登入狀態");
      navigate("/");
    }
  }, [isLogIn]);

  // 倒數計時
  // Update timeLeft on mount and every second
  useEffect(() => {
    const getRemainingTime = () => {
      const diff = nextSendTime - Date.now();
      return diff > 0 ? diff : 0;
    };

    const interval = setInterval(() => {
      const remaining = getRemainingTime();
      if (remaining <= 0) {
        removeNextSendTime(); // Optional: clear localStorage after expired
      }
      setTimeLeft(remaining);
    }, 1000);

    const initialRemaining = getRemainingTime();
    setTimeLeft(initialRemaining); // Initialize the state immediately

    return () => clearInterval(interval);
  }, [nextSendTime]);

  const secondsLeft = Math.ceil(timeLeft / 1000);

  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100">
        <div className="loginModalHeight relative flex w-[85%] max-w-[400px] flex-col items-center rounded-lg bg-white p-4 sm:rounded-xl">
          {/* 更改密碼 */}
          <form
            onSubmit={(e) => handleChangePassword(e)}
            className={`absolute top-0 left-0 flex h-full w-full flex-col items-center gap-6 overflow-y-auto rounded-lg bg-white p-2 transition-all ease-in-out sm:rounded-xl sm:p-4`}
          >
            <h1 className="mb-2 text-[1.5rem] font-bold text-black sm:text-[2rem]">
              更改密碼
            </h1>
            {/* input區域--帳號 */}
            <div
              className={`${accountError === "" ? "border-gray-200 bg-white" : "border-2 border-red-400"} relative flex w-full rounded-lg border-1 px-1 py-2 shadow-lg`}
            >
              <div className="flex w-[15%] items-center justify-center">
                <FaRegUser />
              </div>

              <input
                onChange={(e) => {
                  setAccount(e.target.value);
                  setAccountError("");
                }}
                value={account}
                placeholder="請輸入帳號(電子郵件)"
                className="w-[60%] outline-none"
                type="email"
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (secondsLeft > 0) return;
                  handleSendValidateCode();
                }}
                className={`${isSendValidateCodeLoading ? "pointer-events-none bg-gray-100 text-gray-400" : secondsLeft > 0 ? "pointer-events-none bg-gray-100" : ""} ml-auto inline-block h-full w-max rounded-lg bg-gray-200 px-1 text-[.6rem] font-bold hover:cursor-pointer sm:px-2 sm:text-[.8rem]`}
              >
                {secondsLeft > 0 ? `${secondsLeft}秒` : "傳送驗證碼"}
              </button>
              {accountError !== "" && (
                <span className="absolute top-[120%] left-0 text-[.8rem] text-red-500">
                  {accountError}
                </span>
              )}
            </div>
            {/* 電子郵件驗證碼 */}
            <div
              className={`relative mt-3 flex w-full rounded-lg border-1 border-gray-200 bg-white px-1 py-2 shadow-lg`}
            >
              <div className="flex w-[15%] items-center justify-center">
                <IoKeyOutline className="stroke-1 text-[1.2rem]" />
              </div>
              <input
                onChange={(e) => {
                  setValidateCode(e.target.value);
                }}
                value={validateCode}
                placeholder="請輸入驗證碼"
                className="w-[85%] outline-none"
                type="text"
              />
            </div>
            {/* input區域--密碼 */}
            <div
              className={`${passwordError === "" ? "border-gray-200 bg-white" : "border-2 border-red-400"} relative mt-3 flex w-full rounded-lg border-1 px-1 py-2 shadow-lg`}
            >
              <div className="flex w-[15%] items-center justify-center">
                <CiLock className="stroke-1 text-[1.2rem]" />
              </div>
              <input
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                value={password}
                placeholder="請輸入密碼"
                className="w-[85%] outline-none"
                type="text"
              />
              {passwordError !== "" && (
                <span className="absolute top-[120%] left-0 text-[.8rem] text-red-500">
                  {passwordError}
                </span>
              )}
            </div>
            {/* 確認密碼 */}
            <div
              className={`${rePasswordError === "" ? "border-gray-200 bg-white" : "border-2 border-red-400"} relative mt-3 flex w-full rounded-lg border-1 px-1 py-2 shadow-lg`}
            >
              <div className="flex w-[15%] items-center justify-center">
                <CiLock className="stroke-1 text-[1.2rem]" />
              </div>
              <input
                onChange={(e) => {
                  setRePassword(e.target.value);
                  setRePasswordError("");
                }}
                value={rePassword}
                placeholder="請再次輸入密碼"
                className="w-[85%] outline-none"
                type="text"
              />
              {rePasswordError !== "" && (
                <span className="absolute top-[120%] left-0 text-[.8rem] text-red-500">
                  {rePasswordError}
                </span>
              )}
            </div>

            {/* 變更按鈕 */}
            <button
              type="submit"
              className="mt-auto mb-[1rem] w-[250px] rounded-full bg-[var(--light-theme-color)] py-3 text-white hover:cursor-pointer hover:bg-blue-700"
            >
              更改
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
