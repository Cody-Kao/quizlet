import { useState } from "react";
import { SlMagnifier } from "react-icons/sl";
import { useNavigate } from "react-router";

export default function SearchBar() {
  const [query, setQuery] = useState<string>("");
  const navigate = useNavigate();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = query.trim();
        if (q === "") return;
        navigate(`/searchWordSet/?query=${q}`, { replace: false });
      }}
      className="flex h-[80%] max-h-[40px] w-[85%] max-w-[580px] items-center justify-between rounded-xl bg-gray-200 px-4 focus-within:ring-2 focus-within:ring-gray-400"
    >
      <div className="relative w-full">
        <input
          onChange={(e) => setQuery(e.target.value)}
          value={query}
          className="w-full bg-transparent p-2 text-gray-700 placeholder-gray-500 outline-none"
          placeholder="搜尋字卡名稱"
        />
        <button
          type="button" // 不然會跟底下的button衝突，因為這個也是預設為submit
          onClick={(e) => {
            e.stopPropagation();
            setQuery("");
          }}
          className={`${query === "" ? "hidden" : "block"} absolute top-[50%] right-[10px] translate-y-[-50%] text-[1rem] hover:cursor-pointer`}
        >
          &#10006;
        </button>
      </div>
      {/* Magnifier Icon */}
      <button className="ml-2 text-gray-500 hover:cursor-pointer" type="submit">
        <SlMagnifier />
      </button>
    </form>
  );
}
