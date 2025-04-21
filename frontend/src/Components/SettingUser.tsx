import { useEffect, useRef, useState } from "react";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { useNavigate } from "react-router";
import { postRequest } from "../Utils/postRequest";
import { PATH, resendValidateCodeTime } from "../Consts/consts";
import ClipLoader from "react-spinners/ClipLoader";
import { CgProfile } from "react-icons/cg";
import {
  ChangeUserEmailRequest,
  ChangeUserNameRequest,
  RequestValidateCodeRequest,
} from "../Types/request";
import { NoticeDisplay } from "../Types/types";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";
import { useLocalStorage } from "../Hooks/useLocalStorage";
import { isValidEmail, isValidName } from "../Utils/utils";

export default function SettingUser() {
  const { user } = useLogInContextProvider();
  const { setNotice } = useNoticeDisplayContextProvider();
  const navigate = useNavigate();

  // 用這種方式跳轉 可以避免快速地跳上一頁導致規避掉跳轉機制
  useEffect(() => {
    if (user === null) {
      navigate("/");
    }
  }, [user?.id, navigate]); // Run effect when user.userID changes

  if (user === null) {
    return null; // Prevent rendering the component
  }

  const [img, setImg] = useState<string>(user !== null ? user.img : "");
  const [name, setName] = useState<string>(user !== null ? user.name : "");
  const [nameError, setNameError] = useState<string>("");
  const [email, setEmail] = useState<string>(user !== null ? user.email : "");
  const [emailError, setEmailError] = useState<string>("");
  const [validateCode, setValidateCode] = useState<string>("");
  const [validateCodeError, setValidateCodeError] = useState<string>("");
  const [nextSendTime, setNextSendTime, removeNextSendTime] =
    useLocalStorage<number>("settingModalNextSendTime", 0); // 到期時間
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [newName, setNewName] = useState<string>(
    user !== null ? user.name : "",
  );
  const [newEmail, setNewEmail] = useState<string>(
    user !== null ? user.email : "",
  );

  const [isNameSetting, setIsNameSetting] = useState<boolean>(false);
  const [isEmailSetting, setIsEmailSetting] = useState<boolean>(false);

  // 等待設定生效(等DB回覆)
  const [isImgLoading, setIsImgLoading] = useState<boolean>(false);
  const [isNameLoading, setIsNameLoading] = useState<boolean>(false);
  const [isEmailLoading, setIsEmailLoading] = useState<boolean>(false);
  const [isValidateCodeLoading, setIsValidateCodeLoading] =
    useState<boolean>(false);

  // 處理profile image upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    // Validate file type
    if (!file.type.match("image.*")) {
      setNotice({
        type: "Error",
        payload: { message: "請選擇圖片文件" },
      } as NoticeDisplay);
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleButtonClick = () => {
    // Trigger the hidden file input when button is clicked
    fileInputRef.current?.click();
  };

  const handleSubmitProfile = async () => {
    if (!selectedFile) return;

    // You can send `selectedFile` to your server here
    // or use a hidden form with FormData
    setIsImgLoading(true);
    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("userID", user.id); // 加上這行，後端就能從裡面提取userID去確認使用者
    postRequest(`${PATH}/changeUserImage`, formData)
      .then((data) => {
        setImg(data);
        setNotice({
          type: "Success",
          payload: { message: "頭貼更改成功 重整以更新" },
        } as NoticeDisplay);
      })
      .catch((error) => {
        setNotice(error as NoticeDisplay);
      })
      .finally(() => {
        setIsImgLoading(false);
        setSelectedFile(null);
      });
  };

  const checkName = (): boolean => {
    const userName = newName.trim();
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

  const handleSubmitName = () => {
    if (!isNameSetting) {
      setIsNameSetting(true);
    } else {
      if (nameError !== "") return;
      if (name === newName) {
        setIsNameSetting(false);
        return;
      }
      if (!checkName()) {
        return;
      }
      if (newName === import.meta.env.VITE_ADMINNAME) {
        setNotice({
          type: "Error",
          payload: {
            message: `使用者名稱不得為${import.meta.env.VITE_ADMINNAME}`,
          },
        });
        return;
      }
      setIsNameLoading(true);
      postRequest(`${PATH}/changeUserName`, {
        userID: user.id,
        newName: newName,
      } as ChangeUserNameRequest)
        .then(() => {
          setNotice({
            type: "Success",
            payload: { message: "更改名稱成功" },
          } as NoticeDisplay);
          setName(newName);
        })
        .catch((error) => {
          setNotice(error as NoticeDisplay);
          setNewName(name);
        })
        .finally(() => {
          setIsNameLoading(false);
          setIsNameSetting(false);
        });
    }
  };

  const checkEmail = (): boolean => {
    const userEmail = newEmail.trim();
    if (userEmail.length === 0) {
      setEmailError("帳號不得為空");
      return false;
    }
    if (!isValidEmail(userEmail)) {
      setEmailError("電子郵件格式錯誤");
      return false;
    }
    return true;
  };

  const handleSendValidateCodeRequest = () => {
    if (
      isEmailLoading ||
      !isEmailSetting ||
      email === newEmail ||
      secondsLeft > 0
    )
      return;
    if (!checkEmail()) {
      return;
    }

    setEmailError("");
    setIsValidateCodeLoading(true);
    postRequest(`${PATH}/requestValidateCode/?changeMode=account`, {
      email: newEmail,
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
        setIsValidateCodeLoading(false);
      });
  };

  const handleSubmitEmail = () => {
    if (isEmailLoading) return;
    if (!isEmailSetting) {
      setIsEmailSetting(true);
    } else {
      if (emailError !== "") return;
      if (validateCode === "") {
        setValidateCodeError("驗證碼不得為空");
        return;
      }
      if (email === newEmail) {
        setIsEmailSetting(false);
        return;
      }
      setIsEmailLoading(true);
      postRequest(`${PATH}/changeUserEmail`, {
        userID: user.id,
        newEmail: newEmail,
        validateCode: validateCode,
      } as ChangeUserEmailRequest)
        .then(() => {
          setNotice({
            type: "Success",
            payload: { message: "更改帳號成功" },
          } as NoticeDisplay);
          setEmail(newEmail);
        })
        .catch((error) => {
          setNotice(error as NoticeDisplay);
          setNewEmail(email);
        })
        .finally(() => {
          setIsEmailLoading(false);
          setIsEmailSetting(false);
          setValidateCode("");
        });
    }
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

  const secondsLeft = Math.ceil(timeLeft / 1000);

  // Create references for name and email divs
  const nameRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLDivElement>(null);

  // Click outside detection
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        nameRef.current &&
        !nameRef.current.contains(event.target as Node) &&
        isNameSetting
      ) {
        setNewName(name);
        setIsNameSetting(false);
        setNameError("");
      }

      if (
        emailRef.current &&
        !emailRef.current.contains(event.target as Node) &&
        isEmailSetting
      ) {
        setNewEmail(email);
        setValidateCode("");
        setIsEmailSetting(false);
        setEmailError("");
        setValidateCodeError("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNameSetting, isEmailSetting]);

  return (
    <div className="h-full w-full bg-gray-100 px-[5%] py-[5%] lg:pl-[20%]">
      <div className="flex w-full flex-col items-start justify-center gap-2 lg:w-[80%]">
        <h1 className="mb-6 text-[2.5rem] font-bold text-black">設定</h1>
        <h2 className="text-[1rem] font-bold">個人信息</h2>
        <div className="flex w-full flex-col rounded-xl bg-white py-4">
          {/* Profile Image */}
          <div className="item-center flex h-[120px] w-full justify-between border-b-2 border-gray-200 px-6 sm:h-[150px]">
            <div className="flex flex-col justify-start gap-2">
              <span className="text-black">個人圖片</span>
              {img !== "" ? (
                <img
                  className="h-[4rem] w-[4rem] rounded-full sm:h-[6rem] sm:w-[6rem]"
                  src={img}
                  alt="profile img"
                />
              ) : (
                <CgProfile className="h-[4rem] w-[4rem] rounded-full sm:h-[6rem] sm:w-[6rem]" />
              )}
            </div>

            <div className="flex items-start justify-center gap-4">
              {/* Hidden file input */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Button for selecting file */}
              <button
                type="button"
                onClick={handleButtonClick}
                className="relative font-bold text-[var(--light-theme-color)] hover:cursor-pointer"
              >
                選擇圖片
                {selectedFile && (
                  <div className="absolute top-[110%] left-[50%] flex translate-x-[-50%] flex-col items-center gap-2">
                    <span
                      className={`block w-[150px] truncate overflow-hidden text-center text-[.8rem] whitespace-nowrap`}
                    >
                      {selectedFile?.name}
                    </span>

                    <img
                      src={URL.createObjectURL(selectedFile)}
                      className="h-16 w-16 rounded-full object-cover"
                      alt="Preview"
                    />
                  </div>
                )}
              </button>

              {/* Upload confirm button */}
              {isImgLoading ? (
                <ClipLoader size={24} />
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitProfile}
                  disabled={!selectedFile}
                  className={`font-bold ${
                    selectedFile
                      ? "text-[var(--light-theme-color)] hover:cursor-pointer"
                      : "cursor-not-allowed text-gray-400"
                  }`}
                >
                  上傳圖片
                </button>
              )}
            </div>
          </div>
          {/* User Name */}
          <div
            ref={nameRef}
            className={`item-center flex h-[100px] w-full justify-between border-b-2 border-gray-200 px-6 ${isNameLoading ? "pointer-events-none opacity-50 grayscale" : ""}`}
          >
            <div className={`flex w-[45%] flex-col justify-center gap-2 pb-2`}>
              <span className="text-black">用戶名</span>
              {isNameSetting ? (
                <div className="relative">
                  <input
                    className={`${nameError === "" ? "border-[var(--light-theme-color)]" : "border-red-500"} text w-full border-b-1 text-[1rem] font-bold text-black outline-none md:text-[1.5rem]`}
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      setNameError("");
                    }}
                  />
                  {nameError !== "" && (
                    <span className="absolute top-full left-0 text-[.8rem] text-red-500">
                      {nameError}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[1rem] font-bold text-black md:text-[1.5rem]">
                  {newName}
                </span>
              )}
            </div>
            <button
              onClick={() => handleSubmitName()}
              className="font-bold text-[var(--light-theme-color)] hover:cursor-pointer"
            >
              {isNameSetting ? "完成" : "編輯"}
            </button>
          </div>
          {/* Email */}
          <div
            ref={emailRef}
            className={`item-center flex h-max w-full justify-between px-6 ${isEmailLoading ? "pointer-events-none opacity-50 grayscale" : ""}`}
          >
            <div
              className={`flex w-[80%] flex-col items-start justify-center gap-6 pt-4 pb-2`}
            >
              <div className={`flex w-[80%] flex-col justify-center gap-2`}>
                <span className="text-black">電子郵件(帳號)</span>
                {isEmailSetting ? (
                  <div className="relative">
                    <input
                      className={`${emailError === "" ? "border-[var(--light-theme-color)]" : "border-red-500"} text w-full border-b-1 text-[1rem] font-bold text-black outline-none md:text-[1.5rem]`}
                      value={newEmail}
                      onChange={(e) => {
                        setNewEmail(e.target.value);
                        setEmailError("");
                      }}
                    />
                    {emailError !== "" && (
                      <span className="absolute top-full left-0 text-[.8rem] text-red-500">
                        {emailError}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[1rem] font-bold text-black md:text-[1.5rem]">
                    {newEmail}
                  </span>
                )}
              </div>
              {/* 驗證碼 */}
              <div
                className={`${isEmailSetting ? "" : "pointer-events-none text-gray-300"} flex w-[80%] flex-col justify-center`}
              >
                <span className="text-gray-500">驗證碼</span>
                <div className="relative">
                  <input
                    className={`${isEmailSetting ? (validateCodeError === "" ? "border-b-1 border-[var(--light-theme-color)]" : "border-b-1 border-red-500") : ""} text w-full text-[1rem] font-bold text-gray-500 outline-none`}
                    value={validateCode}
                    onChange={(e) => {
                      setValidateCode(e.target.value);
                      setValidateCodeError("");
                    }}
                  />
                  {validateCodeError !== "" && (
                    <span className="absolute top-full left-0 text-[.8rem] text-red-500">
                      {validateCodeError}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
              <button
                onClick={() => handleSubmitEmail()}
                className={`font-bold text-[var(--light-theme-color)] hover:cursor-pointer`}
              >
                {isEmailSetting ? "完成" : "編輯"}
              </button>
              <button
                onClick={() => handleSendValidateCodeRequest()}
                className={`${isValidateCodeLoading ? "pointer-events-none text-gray-300" : secondsLeft > 0 ? "font-bold" : isEmailSetting && email !== newEmail ? "font-bold text-[var(--light-theme-color)] hover:cursor-pointer" : ""} `}
              >
                {secondsLeft > 0 ? `${secondsLeft}s` : "驗證"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
