import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import Loader from "./Loader";
import { postRequest } from "../Utils/postRequest";
import { PATH } from "../Consts/consts";
import { ActivateEmailRequest } from "../Types/request";

export default function ActivateEmail() {
  const { isLogIn } = useLogInContextProvider();
  const navigate = useNavigate();
  const params = useParams();
  const token = params.token;
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  useEffect(() => {
    if (isLogIn || token === undefined || token.length != 36) {
      navigate("/");
    }
    postRequest(`${PATH}/activateEmail`, {
      token: token,
    } as ActivateEmailRequest)
      .then(() => {
        setErrorMsg("");
      })
      .catch((error) => {
        setErrorMsg(error.payload.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, isLogIn]);

  // 在開通成功時才會執行該程式碼
  useEffect(() => {
    if (!isLoading && errorMsg === "") {
      const timer = setTimeout(() => {
        navigate("/toLogin");
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, errorMsg, navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100">
      {isLoading ? (
        <Loader />
      ) : errorMsg === "" ? (
        <>
          <p className="text-center text-xl text-green-400">
            郵件驗證完成✅，並請在5分鐘內完成註冊
          </p>
          <br />
          <p className="text-center text-xl text-green-400">
            可以直接關閉該頁面。 或8秒後自動導向登入頁面
          </p>
        </>
      ) : (
        <p className="text-xl text-red-400">{errorMsg}❌</p>
      )}
    </div>
  );
}
