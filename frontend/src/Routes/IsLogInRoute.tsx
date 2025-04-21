import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import Loader from "../Components/Loader";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "../Components/ErrorBoundaryFallback";

export default function IsLogInRoute() {
  const { isLogIn, isChecking } = useLogInContextProvider();
  const location = useLocation();
  if (isChecking) {
    return <Loader />;
  }
  // If not logged in and not already on the /toLogIn route, redirect
  if (!isLogIn && location.pathname !== "/toLogIn") {
    return (
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        <Navigate to="/toLogIn" replace />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
      <Outlet />
    </ErrorBoundary>
  );
}
