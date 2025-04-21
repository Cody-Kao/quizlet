import { Suspense, useEffect, useState } from "react";
import Loader from "../Loader";
import { Await } from "react-router";
import FetchErrorPage from "../FetchErrorPage";
import MailBox from "../MailBox";
import { MailViewType } from "../../Types/types";
import { useLogInContextProvider } from "../../Context/LogInContextProvider";
import { getRequest } from "../../Utils/getRequest";
import { PATH } from "../../Consts/consts";
import { z } from "zod";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "../ErrorBoundaryFallback";

export default function FetchMail() {
  const { user } = useLogInContextProvider();
  const [firstMount, setFirstMount] = useState(true);
  const [mailPromise, setMailPromise] = useState<Promise<MailViewType[]>>();

  useEffect(() => {
    if (user === null) return;
    setFirstMount(false);
    setMailPromise(
      getRequest<MailViewType[]>(
        `${PATH}/getMails/${user.id}`,
        z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            content: z.string(),
            date: z.number(),
            receiverID: z.string(),
            read: z.boolean(),
          }),
        ),
      ),
    );
  }, [user]);
  return (
    <Suspense fallback={<Loader />}>
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <Await resolve={mailPromise} errorElement={<FetchErrorPage />}>
          {(resolvedData) => {
            if (firstMount) {
              return null;
            }
            if (resolvedData === undefined || resolvedData === null) {
              throw Error("Data for MailBox is undefined/null");
            }
            return (
              <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
                <MailBox fetchedData={resolvedData} />
              </ErrorBoundary>
            );
          }}
        </Await>
      </ErrorBoundary>
    </Suspense>
  );
}
