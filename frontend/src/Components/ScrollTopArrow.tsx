import { useEffect, useState } from "react";
import { FaArrowUp } from "react-icons/fa";

export default function ScrollTopArrow() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const contentDiv = document.getElementById("content");

    if (!contentDiv) {
      console.warn("Element with ID 'content' not found");
      return;
    }

    const handleScroll = () => {
      // Total scrollable height of the element (including what is not visible)
      const scrollHeight = contentDiv.scrollHeight;

      // Current scroll position (pixels scrolled from top)
      const scrollTop = contentDiv.scrollTop;

      // Visible height of the element
      const clientHeight = contentDiv.clientHeight;

      // Calculate how far down the user has scrolled (as a percentage)
      const scrollPercentage =
        (scrollTop / (scrollHeight - clientHeight)) * 100;

      // Show button when scrolled down more than 40%
      if (scrollPercentage > 40) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Add scroll event listener to the content div, not the window
    contentDiv.addEventListener("scroll", handleScroll);

    // Initial check
    handleScroll();

    return () => {
      // Clean up
      contentDiv.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    const contentDiv = document.getElementById("content");
    if (contentDiv) {
      contentDiv.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed right-2 bottom-13 z-500 flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-white shadow-lg transition-opacity hover:cursor-pointer sm:right-5 sm:h-12 sm:w-12 ${
        isVisible
          ? "opacity-50 hover:opacity-100"
          : "pointer-events-none opacity-0"
      }`}
      aria-label="Scroll to top"
    >
      <FaArrowUp size={24} />
    </button>
  );
}
