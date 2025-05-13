import { useLocation } from "react-router-dom";

import MessageDisplay from "./Components/NoticeDisplay";

import { useEffect } from "react";
import Home from "./Components/Home";

function App() {
  const { pathname } = useLocation();
  const contentDiv = document.getElementById("content");
  useEffect(() => {
    if (contentDiv === null) return;
    //contentDiv.scrollTo({ top: 0, behavior: "smooth" }); for a smooth scroll animation
    contentDiv.scrollTop = 0;
  }, [pathname]);
  return (
    <div className="relative h-max max-h-screen w-full">
      <Home />
      <MessageDisplay />
    </div>
  );
}

export default App;
