import { Suspense, useEffect, useState } from "react";
import { Await, useParams } from "react-router";
import Loader from "../Loader";
import FetchErrorPage from "../FetchErrorPage";
import { getRequest } from "../../Utils/getRequest";
import { PATH } from "../../Consts/consts";
import Game from "../Game";
import { FullWordCardType } from "../../Types/response";
import { useLogInContextProvider } from "../../Context/LogInContextProvider";
import { z } from "zod";
import { Word } from "../../Types/zod_response";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "../ErrorBoundaryFallback";

export default function FetchWords() {
  const { user } = useLogInContextProvider();
  const params = useParams();
  const [fetchWordsPromise, setFetchWordsPromise] = useState<
    Promise<FullWordCardType>
  >(
    getRequest<FullWordCardType>(
      `${PATH}/getWords/${params.wordSetID ?? ""}`,
      z.object({
        id: z.string(),
        title: z.string(),
        words: z.array(Word),
        shouldSwap: z.boolean(),
      }),
    ),
  );

  useEffect(() => {
    if (user === undefined) return;
    setFetchWordsPromise(
      getRequest<FullWordCardType>(
        `${PATH}/getWords/${params.wordSetID ?? ""}`,
        z.object({
          id: z.string(),
          title: z.string(),
          words: z.array(Word),
          shouldSwap: z.boolean(),
        }),
      ),
    );
  }, [params.userID, user?.id]);
  return (
    <Suspense fallback={<Loader />}>
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <Await resolve={fetchWordsPromise} errorElement={<FetchErrorPage />}>
          {(resolvedData) => {
            if (resolvedData === undefined || resolvedData === null) {
              throw Error("Data for Game is undefined/null");
            }
            return (
              <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
                <Game wordSet={resolvedData} />
              </ErrorBoundary>
            );
          }}
        </Await>
      </ErrorBoundary>
    </Suspense>
  );
}
