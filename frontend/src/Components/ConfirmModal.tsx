export default function ConfirmModal({
  description,
  isModalOpen,
  setIsModalOpen,
  callback,
}: {
  description: string;
  isModalOpen: boolean;
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  callback: () => void;
}) {
  return (
    <>
      <div
        onClick={() => setIsModalOpen(false)}
        className={`${isModalOpen ? "visible" : "invisible"} fixed inset-0 z-1000 h-screen w-screen bg-black opacity-[.3]`}
      ></div>
      <div
        className={`${isModalOpen ? "visible top-[50%] opacity-100" : "invisible top-[40%] opacity-0"} fixed left-[50%] z-1000 flex h-[180px] w-[90%] max-w-[360px] translate-[-50%] flex-col justify-between gap-[2rem] rounded-xl bg-white px-3 py-5 transition-all duration-300 sm:max-w-[400px]`}
      >
        {/* cross button */}
        <button
          onClick={() => {
            setIsModalOpen(false);
          }}
          className="absolute top-[.5rem] right-5 h-[2rem] w-[2rem] text-lg hover:cursor-pointer sm:top-[1rem] sm:text-2xl"
        >
          &#x2716;
        </button>
        <h1 className="mt-[1rem] font-bold text-black sm:text-[1.2rem]">
          {description}
        </h1>
        <div className="flex w-full justify-end gap-3 px-3">
          <button
            onClick={() => {
              setIsModalOpen(false);
            }}
            className="rounded-xl px-4 py-2 text-[var(--light-theme-color)] hover:cursor-pointer hover:bg-gray-200 sm:text-[1.5rem]"
          >
            取消
          </button>
          <button
            onClick={() => {
              setIsModalOpen(false);
              callback();
            }}
            className="rounded-xl bg-[var(--light-theme-color)] px-4 py-2 text-white hover:cursor-pointer hover:bg-blue-700 sm:text-[1.5rem]"
          >
            確認
          </button>
        </div>
      </div>
    </>
  );
}
