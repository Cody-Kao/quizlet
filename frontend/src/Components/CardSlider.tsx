import React, { useState, useEffect, JSX, memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SliderDataType } from "../Types/types";

// Define the props type as a generic interface
interface CardSliderProps<T extends SliderDataType> {
  data: T[];
  renderData: (card: T) => JSX.Element;
}

// Create a generic component function
function CardSliderComponent<T extends SliderDataType>({
  data,
  renderData,
}: CardSliderProps<T>) {
  const [startIndex, setStartIndex] = useState(0);

  const cards = data;

  const [visibleCards, setVisibleCards] = useState(3);
  const handleResize = () => {
    const width = window.innerWidth;

    if (width >= 860) {
      setVisibleCards(3);
    } else if (width >= 680) {
      setVisibleCards(2);
    } else {
      setVisibleCards(1);
    }
  };
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set on initial load
    handleResize();

    // Add resize listener
    window.addEventListener("resize", handleResize);

    // Clean up on unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const maxStartIndex = cards.length - visibleCards;

  const handlePrev = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    setStartIndex((prev) => (prev <= 0 ? maxStartIndex : prev - 1));
  };

  const handleNext = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    setStartIndex((prev) => (prev >= maxStartIndex ? 0 : prev + 1));
  };

  return (
    <div className="relative max-w-screen overflow-hidden px-4">
      {cards.length > 0 ? (
        <>
          {/* Navigation buttons */}
          <button
            onClick={(e) => handlePrev(e)}
            className={`${cards.length <= visibleCards ? "pointer-events-none" : ""} absolute top-[50%] left-[10px] z-10 flex h-[90%] w-[30px] translate-y-[-50%] items-center justify-center bg-white/30 text-gray-500 hover:scale-120 hover:cursor-pointer hover:text-gray-600 sm:w-[40px] sm:text-gray-300`}
          >
            <ChevronLeft />
          </button>
          <button
            onClick={(e) => handleNext(e)}
            className={`${cards.length <= visibleCards ? "pointer-events-none" : ""} absolute top-[50%] right-[10px] z-10 flex h-[90%] w-[30px] translate-y-[-50%] items-center justify-center bg-white/30 text-gray-500 hover:scale-120 hover:cursor-pointer hover:text-gray-600 sm:w-[40px] sm:text-gray-300`}
          >
            <ChevronRight />
          </button>
          {/* Slider container */}
          <div className="overflow-hidden">
            <div
              className="flex flex-nowrap transition-transform duration-300 ease-in-out"
              style={{
                transform: `translateX(-${startIndex * (100 / cards.length)}%)`,
                width: `${(cards.length * 100) / visibleCards}% `,
              }}
            >
              {cards.map((card) => renderData(card))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex w-full items-center justify-center">尚無資料</div>
      )}
    </div>
  );
}

// Memoize the component while preserving the generic type
// 讓React.memo下的generic component能正常運作!
const CardSlider = memo(CardSliderComponent) as typeof CardSliderComponent;

export default CardSlider;
