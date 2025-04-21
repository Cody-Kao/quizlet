import { LuBookType } from "react-icons/lu";
import { TruncatedTitle } from "./TruncatedTitle";
import UserLink from "./UserLink";
import { useNavigate, useOutletContext } from "react-router";
import { RecentVisitResponse } from "../Types/response";
import { Suspense, useEffect, useState } from "react";
import { HomePageWordSet } from "../Types/types";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import ClipLoader from "react-spinners/ClipLoader";
import FeedbackCardSlider from "./FeedbackCardSlider";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "./ErrorBoundaryFallback";
import PopularWordSetCardSlider from "./PopularWordSetCardSlider";
import NewWordSetCardSlider from "./NewWordSetCardSlider";

export default function HomeContent({
  fetchedData,
}: {
  fetchedData: RecentVisitResponse;
}) {
  const navigate = useNavigate();
  const wordLimit = useOutletContext<number>();
  const { user } = useLogInContextProvider();
  const [record, setRecord] = useState<HomePageWordSet[]>(fetchedData.record);
  // feedback card
  useEffect(() => {
    setRecord(fetchedData.record);
  }, [fetchedData]);

  return (
    <>
      {/* Content Section - 5 Rows */}
      <div className="grid max-w-full gap-[2rem] lg:grid-rows-4 lg:gap-[1rem]">
        {/* 近期內容 container with fixed height */}
        <div className="px-4 py-2 sm:py-6">
          {/* Title with fixed height */}
          <p className="mb-2 h-8 text-[1rem] font-medium">近期內容</p>

          {/* Grid container with remaining height */}
          {record.length > 0 ? (
            <div className="two-by-two-grid grid h-[85%] sm:h-[80%] sm:gap-2">
              {record.map((r) => (
                <div
                  key={r.id}
                  onClick={() => navigate(`/wordSet/${r.id}`)}
                  className="light-hover-lighter flex items-center gap-4 rounded-xl bg-white py-2 pl-2 hover:cursor-pointer"
                >
                  <LuBookType className="rounded-xl bg-green-100 p-2 text-5xl" />
                  <div>
                    <TruncatedTitle title={r.title} wordLimit={wordLimit} />
                    <span className="light-content-small mt-1 flex items-center gap-2">
                      {r.wordCnt} words • <UserLink userID={r.authorID} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex w-full items-center justify-center">
              {user === null ? "登入以顯示" : "目前無紀錄喔"}
            </div>
          )}
        </div>
        {/* slider */}

        <div className="flex max-w-full flex-col">
          <p className="mb-2 h-8 px-4 text-[1rem] font-medium">熱門字卡</p>
          <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
            <Suspense
              fallback={
                <div className="flex w-full items-center justify-center">
                  <ClipLoader size={32} />
                </div>
              }
            >
              <PopularWordSetCardSlider />
            </Suspense>
          </ErrorBoundary>
        </div>
        <div className="flex max-w-full flex-col">
          <p className="mb-2 h-8 px-4 text-[1rem] font-medium">最新字卡</p>

          <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
            <Suspense
              fallback={
                <div className="flex w-full items-center justify-center">
                  <ClipLoader size={32} />
                </div>
              }
            >
              <NewWordSetCardSlider />
            </Suspense>
          </ErrorBoundary>
        </div>
        <div className="flex max-w-full flex-col">
          <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
            <Suspense
              fallback={
                <div className="flex w-full items-center justify-center">
                  <ClipLoader size={32} />
                </div>
              }
            >
              <FeedbackCardSlider />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </>
  );
}
