import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div className="flex-grows flex h-full w-full flex-col items-center justify-start bg-gray-100 text-center">
      <img
        className="h-[30%] w-[50%] sm:h-[40%] md:h-[55%]"
        src="/image/notFoundEmoji.svg"
        alt="not Found Emoji"
      />
      <p className="text-6xl">404</p>
      <p className="text-4xl">Page Not Found</p>
      <br />
      <p className="text-xl sm:text-2xl">
        The page you are looking for is NOT found
      </p>
      <p className="text-xl sm:text-2xl">
        Here is the Link to send you&nbsp;
        <Link
          to="/"
          className="text-[var(--light-theme-color)] hover:cursor-pointer hover:underline"
        >
          HOME!
        </Link>
      </p>
    </div>
  );
}
