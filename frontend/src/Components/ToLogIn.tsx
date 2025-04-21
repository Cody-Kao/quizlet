import LogInModal from "./LogInModal";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { Navigate } from "react-router-dom";
import Loader from "./Loader";

export default function ToLogIn() {
  console.log("ToLogIn");
  const { isLogIn, isChecking } = useLogInContextProvider();
  if (isChecking) {
    return <Loader />;
  }

  if (isLogIn) {
    return <Navigate to="/" replace />;
  }

  return <LogInModal />;
}
