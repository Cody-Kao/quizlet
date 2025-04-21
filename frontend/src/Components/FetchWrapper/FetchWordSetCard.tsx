import { Suspense, useState, useEffect } from "react";
import { Await, useNavigate, useSearchParams } from "react-router";
import Loader from "../Loader";
import FetchErrorPage from "../FetchErrorPage";
import { getRequest } from "../../Utils/getRequest";
import { PATH } from "../../Consts/consts";
import { SearchWordSetCardResponse } from "../../Types/response";
import SearchWordSet from "../SearchWordSet";
import { z } from "zod";
import { WordSetCard } from "../../Types/zod_response";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "../ErrorBoundaryFallback";

export default function FetchWordSetCard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [firstMount, setFirstMount] = useState(true);
  const query = searchParams.get("query") || "";
  const [fetchWordSetCardPromise, setFetchWordSetCardPromise] =
    useState<Promise<SearchWordSetCardResponse>>();

  useEffect(() => {
    if (query === "" || null) {
      navigate(-1);
    }
  }, [query]);

  useEffect(() => {
    setFirstMount(false);
    setFetchWordSetCardPromise(
      getRequest<SearchWordSetCardResponse>(
        `${PATH}/getWordSetCard/?query=${query}&curNumber=0`,
        z.object({
          wordSetCards: z.array(WordSetCard),
          haveMore: z.boolean(),
        }),
      ),
    );
  }, [query]);

  return (
    <Suspense fallback={<Loader />}>
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <Await
          key={query}
          resolve={fetchWordSetCardPromise}
          errorElement={<FetchErrorPage />}
        >
          {(resolvedData) => {
            if (firstMount) return null;

            if (resolvedData === undefined || resolvedData === null) {
              throw Error("Data for SearchWordSet is undefined/null");
            }

            return (
              <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
                <SearchWordSet data={resolvedData} query={query} />
              </ErrorBoundary>
            );
          }}
        </Await>
      </ErrorBoundary>
    </Suspense>
  );
}
