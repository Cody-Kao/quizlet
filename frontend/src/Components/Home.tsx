import { useEffect, useState } from "react";
import NavBar from "./NavBar";
import SideBar from "./SideBar";
import ScrollTopArrow from "./ScrollTopArrow";
import { Outlet } from "react-router";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "./ErrorBoundaryFallback";

export default function Home() {
  const [isSideBarOpen, setIsSideBarOpen] = useState<boolean>(true);
  const [isSideBarHidden, setIsSideBarHidden] = useState(false);

  const [wordLimit, setWordLimit] = useState(20); // default for large screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 970) {
        setIsSideBarHidden(true);
        setIsSideBarOpen(false);
      } else {
        setIsSideBarHidden(false);
      }
      if (window.innerWidth < 425) {
        setWordLimit(15);
      } else if (window.innerWidth < 530) {
        setWordLimit(20);
      } else if (window.innerWidth < 730) {
        setWordLimit(25);
      } else if (window.innerWidth < 860) {
        setWordLimit(40); // 5 words for small screens
      } else if (window.innerWidth < 1050) {
        setWordLimit(18); // 8 words for medium screens
      } else {
        setWordLimit(30); // 12 words for large screens
      }
    };

    handleResize(); // initial check
    window.addEventListener("resize", handleResize); // listen for resize

    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return (
    <>
      <div
        id="content"
        className="relative flex h-screen w-screen max-w-full flex-col overflow-auto overflow-x-hidden"
      >
        <ScrollTopArrow />
        {/* Top Nav */}
        <NavBar setIsSideBarOpen={setIsSideBarOpen} />
        {/* Main Layout (Sidebar + Content) */}
        <div className="flex w-full flex-shrink flex-grow">
          {/* Overlay */}
          {isSideBarHidden && isSideBarOpen && (
            <div
              className="fixed inset-0 z-500 bg-black opacity-10"
              onClick={() => setIsSideBarOpen(false)}
            />
          )}
          {/* Sidebar */}
          <div
            className={`fixed left-0 z-500 flex h-[100vh] flex-col gap-2 overflow-visible bg-white p-4 transition-all duration-300 ${isSideBarHidden ? (isSideBarOpen ? "top-0 w-[14rem]" : "pointer-events-none w-0 opacity-0") : isSideBarOpen ? "top-[66px] w-[14rem]" : "top-[66px] w-[6rem]"}`}
          >
            <SideBar
              isSideBarOpen={isSideBarOpen}
              setIsSideBarOpen={setIsSideBarOpen}
              isSideBarHidden={isSideBarHidden}
            />
          </div>
          <div
            className={`flex h-full w-full flex-col transition-all duration-300 ${
              isSideBarHidden
                ? "ml-0"
                : isSideBarOpen
                  ? "ml-[14rem]"
                  : "ml-[6rem]"
            }`}
          >
            {/* Content Section */}
            {/* This will render the matched child route */}
            <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
              <Outlet context={wordLimit} />
            </ErrorBoundary>
          </div>
        </div>
        {/* Footer Section */}
        <footer
          className={`light-content-normal flex min-h-[70px] items-center justify-between px-4 transition-all duration-300 ${
            isSideBarHidden
              ? "ml-0"
              : isSideBarOpen
                ? "ml-[14rem]"
                : "ml-[6rem]"
          }`}
        >
          <div className="font-bold text-[#586380]">
            <span className="mr-4">隱私</span> <span>服務條款</span>
          </div>
          <span className="ml-auto inline-block font-bold text-[#586380]">
            中文(繁體)
          </span>
        </footer>
      </div>
    </>
  );
}
