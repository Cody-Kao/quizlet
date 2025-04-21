import HashLoader from "react-spinners/HashLoader";

export default function Loader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <HashLoader color="#4255ff" />
    </div>
  );
}
