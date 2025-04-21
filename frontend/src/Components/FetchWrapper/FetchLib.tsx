import { Suspense, useEffect, useState } from "react";
import Lib from "../Lib";
import { Await, useParams } from "react-router";
import Loader from "../Loader";
import FetchErrorPage from "../FetchErrorPage";
import { useLogInContextProvider } from "../../Context/LogInContextProvider";
import AboutUserPage from "../AboutUserPage";
import { getRequest } from "../../Utils/getRequest";
import { PATH } from "../../Consts/consts";
import { LibPage } from "../../Types/response";
import { z } from "zod";
import {
  LibUserSchema,
  LibWordSetDisplaySchema,
} from "../../Types/zod_response";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "../ErrorBoundaryFallback";

export default function FetchLib() {
  const { user } = useLogInContextProvider();
  const params = useParams();
  const [firstMount, setFirstMount] = useState(true);
  const [libPromise, setLibPromise] = useState<Promise<LibPage>>();

  useEffect(() => {
    if (user === undefined) return;
    setFirstMount(false);
    setLibPromise(
      getRequest<LibPage>(
        `${PATH}/getWordSetsInLib/${params.userID ?? user?.id}`,
        z.object({
          user: LibUserSchema,
          createdWordSets: z.array(LibWordSetDisplaySchema),
          likedWordSets: z.array(LibWordSetDisplaySchema),
        }),
      ),
    );
  }, [params.userID, user?.id]);

  return (
    <Suspense fallback={<Loader />}>
      {/* 
      Await會接住所有children component產生的error以及傳入的promise的error，並且直接render出errorElement，
      問題是，errorElement能接住的error卻只有promise reject時候的error(而這個error屬於可自訂的)，所以不能像
      ErrorBoundary一樣處理general的error，解決辦法就是直接把children component都套上ErrorBoundary，
      讓ErrorBoundary去處理那些general error(非傳入Await的promise error的error)，再把Await外邊套上ErrorBoundary，
      去處理當promise返還的是undefined時候的error
      */}
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <Await resolve={libPromise} errorElement={<FetchErrorPage />}>
          {(resolvedData) => {
            // 避免一開始state裡面是沒有給promise導致resolvedData是undefined的狀況
            if (firstMount) return null;

            // 丟給ErrorBoundary處理
            if (resolvedData === undefined || resolvedData === null) {
              throw Error("Data for Lib is undefined/null");
            }
            const isMyLib =
              params.userID === undefined || user?.id === params.userID;
            return isMyLib ? (
              <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
                <Lib fetchedData={resolvedData} />
              </ErrorBoundary>
            ) : (
              <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
                <AboutUserPage fetchedData={resolvedData} />
              </ErrorBoundary>
            );
          }}
        </Await>
      </ErrorBoundary>
    </Suspense>
  );
}
