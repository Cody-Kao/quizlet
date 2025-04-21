import { Suspense, useState, useEffect } from "react";
import { Await } from "react-router";
import Loader from "../Loader";
import FetchErrorPage from "../FetchErrorPage";
import { getRequest } from "../../Utils/getRequest";
import { PATH } from "../../Consts/consts";
import { FeedbackResponse } from "../../Types/response";
import ViewAllFeedbacks from "../ViewAllFeedbacks";
import { z } from "zod";
import { FeedBackCard_ZOD } from "../../Types/zod_response";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "../ErrorBoundaryFallback";

export default function FetchFeedbackCard() {
  const [fetchWordSetCardPromise, setFetchWordSetCardPromise] =
    useState<Promise<FeedbackResponse>>();
  const [firstMount, setFirstMount] = useState(true);
  useEffect(() => {
    setFirstMount(false);
    setFetchWordSetCardPromise(
      getRequest<FeedbackResponse>(
        `${PATH}/getFeedback/?curNumber=0`,
        z.object({
          feedbacks: z.array(FeedBackCard_ZOD),
          haveMore: z.boolean(),
        }),
      ),
    );
  }, []);

  return (
    <Suspense fallback={<Loader />}>
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <Await
          resolve={fetchWordSetCardPromise}
          errorElement={<FetchErrorPage />}
        >
          {(resolvedData) => {
            if (firstMount) return null;
            if (resolvedData === undefined || resolvedData === null) {
              throw Error("Data for ViewAllFeedbacks is undefined/null");
            }

            return (
              <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
                <ViewAllFeedbacks data={resolvedData} />
              </ErrorBoundary>
            );
          }}
        </Await>
      </ErrorBoundary>
    </Suspense>
  );
}
