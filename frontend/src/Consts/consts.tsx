import { UserLinkType } from "../Types/types.ts";

export const ADMIN: UserLinkType = {
  userID: import.meta.env.VITE_ADMINID,
  userName: import.meta.env.VITE_ADMINNAME,
};

export const CURPATH = import.meta.env.VITE_CURPATH;
export const PATH = import.meta.env.VITE_PATH;

export const soundArray: string[] = [
  "en-US",
  "en-GB",
  "en-AU",
  "zh-TW",
  "zh-CN",
];

export const resendValidateCodeTime = 3 * 60 * 1000; // 3 minutes
export const resendActivationEmailTime = 3 * 60 * 1000; // 3 minutes
