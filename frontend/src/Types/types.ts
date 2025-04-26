// type for display user profile and identify/represent a user in contextProvider
export interface User {
  userID: string;
  userRole: "admin" | "user";
  userName: string;
  userEmail: string;
  userImg: string;
  likedWordSet: Record<string, boolean>;
}

// 讓slider便generic
export interface SliderDateType {
  id: string;
}

// type for sliding card in homepage for popular and new wordSets
export interface WordSetCardType {
  id: string;
  title: string;
  wordCnt: number;
  authorID: string;
}

// type for sliding card in homepage for feedback
export interface FeedBackCard {
  id: string;
  title: string;
  content: string;
  formattedCreatedAt: string;
}

export type sortWordType = "1" | "2" | "3";

// for display mail in mailModal
export interface MailViewType {
  id: string;
  title: string;
  content: string;
  date: number;
  receiverID: string;
  read: boolean;
}

export interface WordSetType {
  id: string;
  title: string;
  description: string;
  authorID: string; // 原作者
  createdAt: string;
  updatedAt: number;
  words: Word[];
  shouldSwap: boolean; // 用來給前端展示是否要swap
  likedUsers: string[]; // 儲存按讚的人
  likes: number; // 讚數
  wordCnt: number;
  allowCopy: boolean; // 允許他人複製衍生
  isPublic: boolean; // 是否在首頁發布
}

// word, for display words in WordCard
export interface Word {
  id: string;
  order: number;
  vocabulary: string;
  definition: string;
  vocabularySound: string;
  definitionSound: string;
  star: boolean;
}

export interface NoticeDisplay {
  type: string;
  payload: MessageError | PageError;
}

export interface MessageError {
  message: string;
}

export interface PageError {
  statusCode: number;
  message: string;
}

export interface EditWord {
  id: string;
  order: number;
  vocabulary: string;
  definition: string;
  vocabularySound: string;
  definitionSound: string;
}

export interface EditWordSetType {
  id: string;
  title: string;
  description: string;
  words: EditWord[];
  shouldSwap: boolean;
}

export interface multiChoice {
  description: string;
  sound: string;
  isAnswer: boolean;
}

export interface multiChoiceQuestion {
  q: [string, string]; // 一個是題目/另一個是發音
  choices: multiChoice[];
}

export interface multiChoiceRecordType {
  chosenIndex: number;
  isCorrect: boolean;
}

export interface clozeQuestion {
  q: [string, string]; // 一個是題目/另一個是發音
  ans: string;
  isHintOpen: boolean;
}

export interface clozeRecordType {
  ans: string;
  userAns: string;
  isCorrect: boolean;
}

export interface gradeType {
  skip: boolean;
  numOfQuestion: number;
  q: string;
  ans: string;
  qSound: string;
  ansSound: string;
}

export interface HomePageWordSet {
  id: string;
  title: string;
  authorID: string;
  wordCnt: number;
}

export interface ImportWord {
  vocabulary: string;
  definition: string;
}

export interface Sound {
  EngName: string;
  TwName: string;
}
