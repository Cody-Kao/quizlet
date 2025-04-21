import { Suspense, useState, useEffect } from "react";
import { WordSetType } from "../../Types/types";
import { Await, useParams } from "react-router";
import Loader from "../Loader";
import FetchErrorPage from "../FetchErrorPage";
import WordSet from "../WordSet";
import EditWordSet from "../EditWordSet";
import { getRequest } from "../../Utils/getRequest";
import { PATH } from "../../Consts/consts";
import { useLogInContextProvider } from "../../Context/LogInContextProvider";
import { z } from "zod";
import { Word } from "../../Types/zod_response";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "../ErrorBoundaryFallback";

export default function FetchWordSet({ mode }: { mode: boolean }) {
  // mode => true代表要給WordSet route; mode => false代表editWordSet route
  const params = useParams();
  const { user } = useLogInContextProvider();
  const [fetchWordSetPromise, setFetchWordSetPromise] = useState<
    Promise<WordSetType>
  >(
    getRequest<WordSetType>(
      `${PATH}/getWordSet/${params.wordSetID}`,
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        authorID: z.string(), // 原作者
        createdAt: z.string(),
        updatedAt: z.number(),
        words: z.array(Word),
        shouldSwap: z.boolean(), // 用來給前端展示是否要swap
        likedUsers: z.array(z.string()), // 儲存按讚的人
        likes: z.number(), // 讚數
        wordCnt: z.number(),
        allowCopy: z.boolean(), // 允許他人複製衍生
        isPublic: z.boolean(), // 是否在首頁發布
      }),
    ),
  );

  useEffect(() => {
    if (user === undefined) return;

    setFetchWordSetPromise(
      getRequest<WordSetType>(
        `${PATH}/getWordSet/${params.wordSetID}`,
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          authorID: z.string(),
          createdAt: z.string(),
          updatedAt: z.number(),
          words: z.array(Word),
          shouldSwap: z.boolean(),
          likedUsers: z.array(z.string()),
          likes: z.number(),
          wordCnt: z.number(),
          allowCopy: z.boolean(),
          isPublic: z.boolean(),
        }),
      ),
    );
  }, [user?.id, params.wordSetID]);

  return (
    <Suspense fallback={<Loader />}>
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <Await resolve={fetchWordSetPromise} errorElement={<FetchErrorPage />}>
          {(resolvedData) => {
            if (resolvedData === undefined || resolvedData === null) {
              throw Error("Data for WordSet/EditWordSet is undefined/null");
            }
            // 若編輯的人不是作者本人 則不會跳到編輯頁面
            return mode ||
              (mode === false && resolvedData.authorID !== user?.id) ? (
              <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
                <WordSet wordSet={resolvedData} />
              </ErrorBoundary>
            ) : (
              <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
                <EditWordSet wordSet={resolvedData} />
              </ErrorBoundary>
            );
          }}
        </Await>
      </ErrorBoundary>
    </Suspense>
  );
}
