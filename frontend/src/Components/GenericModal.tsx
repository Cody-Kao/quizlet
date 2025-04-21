import { createPortal } from "react-dom";
import { JSX, useEffect, useState } from "react";

export default function GenericModal<T>({
  isModalOpen,
  handleClose,
  data,
  renderData,
}: {
  isModalOpen: boolean;
  handleClose: () => void;
  data: T;
  renderData: (data: T) => JSX.Element;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  // 利用portal直接讓該fixed position吸附在body上，而不會侷限於它本身的parent
  return createPortal(
    <>
      {/* overlay */}
      <div
        onClick={handleClose}
        className={`${
          isModalOpen ? "visible" : "invisible"
        } fixed inset-0 z-[1000] h-screen w-screen bg-black opacity-[.3]`}
      ></div>

      {/* modal content */}
      <div
        className={`${
          isModalOpen
            ? "visible top-[50%] opacity-100"
            : "invisible top-[40%] opacity-0"
        } fixed left-[50%] z-[1000] flex max-h-[300px] min-h-[250px] w-[90%] max-w-[360px] translate-x-[-50%] translate-y-[-50%] flex-col justify-between gap-[2rem] rounded-xl bg-white px-3 py-5 transition-all duration-300 sm:max-w-[400px]`}
      >
        <button
          onClick={handleClose}
          className="absolute top-[.5rem] right-5 h-[2rem] w-[2rem] text-lg hover:cursor-pointer sm:top-[1rem] sm:text-2xl"
        >
          &#x2716;
        </button>
        {renderData(data)}
      </div>
    </>,
    document.body, // 利用portal直接讓該fixed position吸附在body上，而不會侷限於它本身的parent
  );
}
