import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getRequest } from "../Utils/getRequest";
import { PATH } from "../Consts/consts";
import { UserLinkType } from "../Types/response";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { CgProfile } from "react-icons/cg";
import { FaUserAltSlash } from "react-icons/fa";
import { useNoticeDisplayContextProvider } from "../Context/NoticeDisplayContextProvider";
import { NoticeDisplay } from "../Types/types";
import { z } from "zod";
import ClipLoader from "react-spinners/ClipLoader";

export default function UserLink({ userID }: { userID: string }) {
  const { user } = useLogInContextProvider();
  const NO_USER = userID === ""; // 保險起見做判斷
  const { setNotice } = useNoticeDisplayContextProvider();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [userImg, setUserImg] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("user");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getRequest<UserLinkType>(
      `${PATH}/getUserLink/${userID}`,
      z.object({
        id: z.string(),
        role: z.union([z.literal("admin"), z.literal("user")]),
        name: z.string(),
        img: z.string(),
      }),
    )
      .then((data) => {
        setUserName(data.name);
        setUserImg(data.img);
        setUserRole(data.role);
      })
      .catch((error) => {
        setNotice(error as NoticeDisplay);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [userID]);
  return (
    <div
      className={`${isLoading ? "pointer-events-none" : ""} ${NO_USER ? "pointer-events-none opacity-60 grayscale" : ""} group relative block w-fit rounded-md hover:cursor-pointer`}
      onClick={(e) => {
        e.preventDefault(); // Prevents the default link behavior(not re-fresh the page)
        e.stopPropagation();

        navigate(userID === user?.id ? "/myLib" : `/lib/${userID}`);
      }}
    >
      {/* Overlay */}
      <div
        className={`${userRole === "user" ? "bg-[var(--light-theme-color)]" : "bg-yellow-500"} absolute inset-0 rounded-md opacity-20 transition-opacity duration-200 group-hover:opacity-20 sm:opacity-0`}
      ></div>

      {/* Content */}
      <div
        title={userName}
        className="relative flex items-center gap-1 text-black"
      >
        {NO_USER ? (
          <FaUserAltSlash className="h-[1.2rem] w-[1.2rem] rounded-full sm:h-[1.5rem] sm:w-[1.5rem]" />
        ) : userImg !== "" ? (
          <img
            className="h-[1.5rem] w-[1.5rem] rounded-full sm:h-[2rem] sm:w-[2rem]"
            src={userImg}
            alt="" // hide broken image icon by leaving alt as a empty string
          />
        ) : (
          <CgProfile className="h-[1.5rem] w-[1.5rem] rounded-full sm:h-[2rem] sm:w-[2rem]" />
        )}
        {isLoading ? (
          <ClipLoader size={16} />
        ) : (
          <span className="sm:text-[1rem]">
            {NO_USER
              ? "查無使用者"
              : userName.length > 8
                ? userName.slice(0, 8) + "..."
                : userName}
          </span>
        )}
      </div>
    </div>
  );
}
