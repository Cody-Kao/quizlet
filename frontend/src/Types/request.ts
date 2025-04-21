import { EditWordSetType, Word, WordSetType } from "./types";

export interface AccountPasswordLogInRequest {
  userEmail: string;
  userPassword: string;
}

export interface AccountPasswordRegisterRequest {
  userName: string;
  userEmail: string;
  userPassword: string;
  reUserPassword: string;
}

export interface OAuthLogInRequest {
  credential: string;
}

export interface OAuthRegisterRequest {
  credential: string;
}

export interface ToggleLikeWordSetRequest {
  userID: string;
  wordSetID: string;
}

export interface ForkWordSetRequest {
  userID: string;
  wordSetID: string;
}

export interface DeleteWordSetRequest {
  wordSetID: string;
}

export interface ToggleWordStarRequest {
  wordSetID: string;
  wordID: string;
}

export interface ToggleAllWordStarRequest {
  wordSetID: string;
  newStar: boolean;
}

export interface InlineUpdateWordRequest {
  wordSetID: string;
  wordID: string;
  newVocabulary: string;
  newDefinition: string;
}

export interface BigWordCardUpdateWordRequest {
  wordSetID: string;
  wordID: string;
  newVocabulary: string;
  newDefinition: string;
  newVocabularySound: string;
  newDefinitionSound: string;
}

export interface AddWordRequest {
  wordSetID: string;
  word: Word;
}

export interface ChangeUserNameRequest {
  userID: string;
  newName: string;
}

export interface ChangeUserEmailRequest {
  userID: string;
  newEmail: string;
  validateCode: string;
}

export interface CreateWordSetRequest {
  userID: string;
  wordSet: WordSetType;
}

export interface EditWordSetRequest {
  addWords: Word[];
  wordSet: EditWordSetType;
  removeWords: string[];
}

export interface ReadMailRequest {
  userID: string;
  mailID: string;
}

export interface AddRecentVisitRequest {
  userID: string;
  wordSetID: string;
}

export interface ToggleAllowCopyRequest {
  userID: string;
  wordSetID: string;
}
export interface ToggleIsPublicRequest {
  userID: string;
  wordSetID: string;
}

export interface CreateFeedbackRequest {
  authorID: string;
  title: string;
  content: string;
}

export interface LogErrorRequest {
  userID: string;
  errorID: string;
  error: string;
  errorInfo: string;
  time: string;
}

export interface RequestValidateCodeRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  validateCode: string;
  password: string;
  rePassword: string;
}

export interface SendActivateEmailRequest {
  email: string;
}

export interface ActivateEmailRequest {
  token: string;
}
