import { FeedBackCard, HomePageWordSet, Word } from "./types";

/*Strict typing for APIResponse*/
export interface APIResponseSuccess<T = any> {
  type: "Success";
  payload: T;
}

export interface APIResponseError {
  type: "Error";
  payload: { message: string; [key: string]: any };
}

export type APIResponse<T = any> = APIResponseSuccess<T> | APIResponseError;

export interface FrontEndUser {
  id: string;
  role: string;
  name: string;
  email: string;
  img: string;
  likedWordSets: string[];
}

export interface LibUser {
  id: string;
  role: "admin" | "user";
  name: string;
  img: string;
  createdAt: string;
  likeCnt: number;
  forkCnt: number;
}

export interface LibWordSetDisplay {
  id: string;
  title: string;
  authorID: string;
  wordCnt: number;
  createdAt: string;
  updatedAt: number;
}

export interface LibPage {
  user: LibUser;
  createdWordSets: LibWordSetDisplay[];
  likedWordSets: LibWordSetDisplay[];
}

export interface UserLinkType {
  id: string;
  role: "admin" | "user";
  name: string;
  img: string;
}

export interface FullWordCardType {
  id: string;
  title: string;
  words: Word[];
  shouldSwap: boolean; // 用來給前端展示是否要swap
}

export interface SearchWordSetCardResponse {
  wordSetCards: WordSetCard[];
  haveMore: boolean;
}

export interface WordSetCard {
  id: string;
  title: string;
  authorID: string;
  updatedAt: number;
  shouldSwap: boolean;
  wordCnt: number;
  likes: number;
}

export interface WordSetCardPreview {
  words: Word[];
  haveMore: boolean; // 是否還有words可以要
}

export interface RecentVisitResponse {
  record: HomePageWordSet[];
}

export interface NewWordSetResponse {
  newWordSet: HomePageWordSet[];
}

export interface PopularWordSetResponse {
  popularWordSet: HomePageWordSet[];
}

export interface FeedbackResponse {
  feedbacks: FeedBackCard[];
  haveMore: boolean;
}
