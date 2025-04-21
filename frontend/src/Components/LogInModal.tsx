import { MdOutlineDriveFileRenameOutline } from "react-icons/md";
import { FaRegUser } from "react-icons/fa6";
import { CiLock } from "react-icons/ci";
import { FaArrowRight, FaArrowLeft } from "react-icons/fa";
import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { isValidEmail, isValidName, isValidPassword } from "../Utils/utils";
import { postRequest } from "../Utils/postRequest";
import {
  AccountPasswordLogInRequest,
  AccountPasswordRegisterRequest,
  OAuthLogInRequest,
  OAuthRegisterRequest,
  SendActivateEmailRequest,
} from "../Types/request";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { NoticeDisplay } from "../Types/types";
import { PATH, resendActivationEmailTime } from "../Consts/consts";
import { FrontEndUser } from "../Types/response";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";
import { useLocalStorage } from "../Hooks/useLocalStorage";

export default function LogInModal() {
  const { setLogIn, setUser } = useLogInContextProvider();
  const { setNotice } = useNoticeDisplayContextProvider();
  const [name, setName] = useState<string>("");
  const [account, setAccount] = useState<string>("");
  const [isSendActivationEmailLoading, setIsSendActivationEmailLoading] =
    useState(false);
  const [nextSendTime, setNextSendTime, removeNextSendTime] =
    useLocalStorage<number>("nextSendActivationTime", 0); // 到期時間
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [password, setPassword] = useState<string>("");
  const [rePassword, setRePassword] = useState<string>("");

  const [nameError, setNameError] = useState<string>("");
  const [accountError, setAccountError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [rePasswordError, setRePasswordError] = useState<string>("");
  const [isSliding, setIsSliding] = useState<boolean>(false);
  // 處理sliding
  const handleSliding = () => {
    setName("");
    setAccount("");
    setPassword("");
    setRePassword("");
    setNameError("");
    setAccountError("");
    setPasswordError("");
    setRePasswordError("");
    setIsSliding((prev) => !prev);
  };

  // 處理名稱檢查
  const checkName = (): boolean => {
    const userName = name.trim();
    if (userName.length === 0) {
      setNameError("使用者名稱不得為空");
      return false;
    }
    if (userName.length > 12) {
      setNameError("使用者名稱不得超過12字元");
      return false;
    }
    if (userName === import.meta.env.VITE_ADMINNAME) {
      setNameError(`使用者名稱不得為${import.meta.env.VITE_ADMINNAME}`);
      return false;
    }
    if (!isValidName(userName)) {
      setNameError("使用者名稱只能包含英文、數字、底線");
      return false;
    }

    return true;
  };

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

  // 處理使用帳密登入
  const handleAccountPasswordLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!checkAccount()) {
      return;
    }
    setAccountError("");

    if (!checkPassword()) {
      return;
    }
    setPasswordError("");

    postRequest(`${PATH}/accountPasswordLogIn`, {
      userEmail: account,
      userPassword: password,
    } as AccountPasswordLogInRequest)
      .then((data) => {
        setLogIn();
        setUser(data.payload as FrontEndUser);
      })
      .catch((error) => {
        console.log(error);
        setNotice(error as NoticeDisplay);
      });
  };

  // 處理使用帳密註冊
  const handleAccountPasswordRegister = (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    if (!checkName()) {
      return;
    }
    setNameError("");
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

    postRequest(`${PATH}/accountPasswordRegister`, {
      userName: name.trim(),
      userEmail: account.trim(),
      userPassword: password,
      reUserPassword: rePassword,
    } as AccountPasswordRegisterRequest)
      .then((data) => {
        setLogIn();
        setUser(data.payload as FrontEndUser);
        setNotice({
          type: "Success",
          payload: { message: "註冊成功!" },
        } as NoticeDisplay);
      })
      .catch((error) => {
        setNotice(error as NoticeDisplay);
      });
  };

  // 處理OAuth登入
  const handleOAuthLogIn = (credentialToken: string) => {
    postRequest(`${PATH}/OAuthLogIn`, {
      credential: credentialToken,
    } as OAuthLogInRequest)
      .then((data) => {
        setLogIn();
        setUser(data.payload as FrontEndUser);
        setNotice({
          type: "Success",
          payload: { message: "登入成功!" },
        } as NoticeDisplay);
      })
      .catch((error) => {
        console.log(error);
        setNotice(error as NoticeDisplay);
      });
  };

  // 處理OAuth註冊
  const handleOAuthRegister = (credentialToken: string) => {
    postRequest(`${PATH}/OAuthRegister`, {
      credential: credentialToken,
    } as OAuthRegisterRequest)
      .then((data) => {
        setLogIn();
        setUser(data.payload as FrontEndUser);
        setNotice({
          type: "Success",
          payload: { message: "註冊成功!" },
        } as NoticeDisplay);
      })
      .catch((error) => {
        console.log(error);
        setNotice(error as NoticeDisplay);
      });
  };

  // 處理送email activation
  const handleSendValidateEmail = () => {
    if (isSendActivationEmailLoading || secondsLeft > 0) return;
    if (!checkAccount()) {
      return;
    }
    setAccountError("");
    setIsSendActivationEmailLoading(true);
    // send request
    postRequest(`${PATH}/sendActivationEmail`, {
      email: account,
    } as SendActivateEmailRequest)
      .then(() => {
        setNextSendTime(Date.now() + resendActivationEmailTime);
        setNotice({
          type: "Success",
          payload: { message: "開通連結已寄出" },
        } as NoticeDisplay);
      })
      .catch((error) => {
        setNotice(error as NoticeDisplay);
        setNextSendTime(Date.now() + 10 * 1000); // 若出錯就暫停10秒
      })
      .finally(() => {
        setIsSendActivationEmailLoading(false);
      });
  };

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

  const secondsLeft = Math.ceil(timeLeft / 1000); // convert millisecond to second

  return (
    <>
      <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100">
        <div className="loginModalHeight relative flex w-[85%] max-w-[400px] flex-col items-center rounded-lg bg-white p-4 sm:rounded-2xl">
          {/* 登入 */}
          <form
            onSubmit={(e) => handleAccountPasswordLogin(e)}
            className={`absolute top-0 left-0 flex h-full w-full flex-col items-center gap-5 overflow-y-auto rounded-lg bg-white p-4 transition-all ease-in-out sm:gap-7 sm:rounded-2xl ${isSliding ? "invisible" : "visible translate-x-0"}`}
          >
            <h1 className="mb-2 text-[2rem] font-bold text-black">Login</h1>
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
                className="w-[85%] outline-none"
                type="email"
              />
              {accountError !== "" && (
                <span className="absolute top-[120%] left-0 text-[.8rem] text-red-500">
                  {accountError}
                </span>
              )}
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
            {/* 忘記密碼 */}
            <div className="flex w-full items-center justify-end">
              <span className="hover:cursor-pointer hover:text-[var(--light-theme-color)] hover:underline">
                忘記密碼
              </span>
            </div>
            {/* 登入按鈕 */}
            <button
              type="submit"
              className="w-[250px] rounded-full bg-[var(--light-theme-color)] py-3 text-white hover:cursor-pointer hover:bg-blue-700"
            >
              登入
            </button>

            <GoogleLogin
              type="standard"
              size="large"
              text="signin"
              shape="circle"
              onSuccess={(credentialResponse) => {
                handleOAuthLogIn(
                  credentialResponse.credential !== undefined
                    ? credentialResponse.credential
                    : "",
                );
              }}
            />

            <button
              type="button" // 防止submit
              onClick={() => {
                handleSliding();
              }}
              className="right-[5px] bottom-0 mt-auto ml-auto flex items-center gap-1 hover:cursor-pointer sm:absolute"
            >
              點我去註冊
              <FaArrowRight />
            </button>
          </form>
          {/* 註冊 */}
          <form
            onSubmit={(e) => handleAccountPasswordRegister(e)}
            className={`absolute top-0 left-0 flex h-full w-full flex-col items-center gap-4 overflow-y-auto rounded-lg bg-white p-4 transition-all duration-300 ease-in-out sm:gap-7 sm:rounded-2xl ${isSliding ? "visible translate-x-0" : "invisible translate-x-[20%]"}`}
          >
            <h1 className="text-[2rem] font-bold text-black">Register</h1>
            {/* 使用者名稱 */}
            <div
              className={`${nameError === "" ? "border-gray-200 bg-white" : "border-2 border-red-400"} relative flex w-full rounded-lg border-1 px-1 py-2 shadow-lg`}
            >
              <div className="flex w-[15%] items-center justify-center">
                <MdOutlineDriveFileRenameOutline className="text-[1.2rem]" />
              </div>
              <input
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError("");
                }}
                value={name}
                placeholder="請輸入使用者名稱"
                className="w-[85%] outline-none"
                type="text"
              />
              {nameError !== "" && (
                <span className="absolute top-[120%] left-0 text-[.8rem] text-red-500">
                  {nameError}
                </span>
              )}
            </div>
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
                type="text"
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (secondsLeft > 0) return;
                  handleSendValidateEmail();
                }}
                className={`${isSendActivationEmailLoading ? "pointer-events-none bg-gray-100 text-gray-400" : secondsLeft > 0 ? "pointer-events-none bg-gray-100" : ""} ml-auto inline-block h-full w-max rounded-lg bg-gray-200 px-1 text-[.6rem] font-bold hover:cursor-pointer sm:px-2 sm:text-[.8rem]`}
              >
                {secondsLeft > 0 ? `${secondsLeft}秒` : "驗證信箱"}
              </button>
              {accountError !== "" && (
                <span className="absolute top-[120%] left-0 text-[.8rem] text-red-500">
                  {accountError}
                </span>
              )}
            </div>
            {/* input區域--密碼 */}
            <div
              className={`${passwordError === "" ? "border-gray-200 bg-white" : "border-2 border-red-400"} relative flex w-full rounded-lg border-1 px-1 py-2 shadow-lg`}
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

            {/* input區域--確認密碼 */}
            <div
              className={`${rePasswordError === "" ? "border-gray-200 bg-white" : "border-2 border-red-400"} relative flex w-full rounded-lg border-1 px-1 py-2 shadow-lg`}
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

            {/* 註冊按鈕 */}
            <button
              type="submit"
              className="w-[250px] rounded-full bg-[var(--light-theme-color)] py-2 text-white hover:cursor-pointer hover:bg-blue-700"
            >
              註冊
            </button>
            <GoogleLogin
              type="standard"
              size="large"
              text="signup_with"
              shape="circle"
              onSuccess={(credentialResponse) => {
                handleOAuthRegister(
                  credentialResponse.credential !== undefined
                    ? credentialResponse.credential
                    : "",
                );
              }}
            />
            <button
              type="button" // 防止submit
              onClick={() => {
                handleSliding();
              }}
              className="absolute bottom-0 left-[5px] ml-auto flex items-center gap-1 hover:cursor-pointer"
            >
              <FaArrowLeft />
              點我去登入
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
