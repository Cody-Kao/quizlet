import { Suspense, useEffect, useState } from "react";
import { Await } from "react-router";
import Loader from "../Loader";
import FetchErrorPage from "../FetchErrorPage";
import { useLogInContextProvider } from "../../Context/LogInContextProvider";
import { getRequest } from "../../Utils/getRequest";
import { PATH } from "../../Consts/consts";
import { RecentVisitResponse } from "../../Types/response";
import HomeContent from "../HomeContent";
import { z } from "zod";
import { HomePageWordSet_ZOD } from "../../Types/zod_response";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "../ErrorBoundaryFallback";

export default function FetchRecentVisit() {
  console.log("FetchRecentVisit");
  const { user } = useLogInContextProvider();
  const [firstMount, setFirstMount] = useState(true);
  const [RecentVisitPromise, setRecentVisitPromise] =
    useState<Promise<RecentVisitResponse>>();
  useEffect(() => {
    setFirstMount(false);
    setRecentVisitPromise(
      user !== null
        ? getRequest<RecentVisitResponse>(
            `${PATH}/getRecentVisit/${user.id}`,
            z.object({
              record: z.array(HomePageWordSet_ZOD),
            }),
          )
        : // 如果使用者沒有登入，則直接返還record為空的RecentVisitResponse，後續會被HomeContent處理
          new Promise<RecentVisitResponse>((resolve, _) => {
            resolve({
              record: [],
            });
          }),
    );
  }, [user?.id]);

  return (
    <Suspense fallback={<Loader />}>
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <Await resolve={RecentVisitPromise} errorElement={<FetchErrorPage />}>
          {(resolvedData) => {
            if (firstMount) return null;

            if (resolvedData === undefined || resolvedData === null) {
              throw Error("Data for HomeContent is undefined/null");
            }

            return (
              <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
                <HomeContent fetchedData={resolvedData} />
              </ErrorBoundary>
            );
          }}
        </Await>
      </ErrorBoundary>
    </Suspense>
  );
}
