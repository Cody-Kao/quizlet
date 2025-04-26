import { Sound } from "../Types/types";

export const ADMIN = {
  id: import.meta.env.VITE_ADMINID,
  role: "admin",
  name: import.meta.env.VITE_ADMINNAME,
};

export const CURPATH = import.meta.env.VITE_CURPATH;
export const PATH = import.meta.env.VITE_PATH;

export const soundArray: Sound[] = [
  { EngName: "en-US", TwName: "英文(美式)" },
  { EngName: "en-GB", TwName: "英文(英式)" },
  { EngName: "en-AU", TwName: "英文(澳洲)" },
  { EngName: "zh-TW", TwName: "中文(繁體)" },
  { EngName: "zh-CN", TwName: "中文(簡體)" },
];

export const resendValidateCodeTime = 3 * 60 * 1000; // 3 minutes
export const resendActivationEmailTime = 3 * 60 * 1000; // 3 minutes
