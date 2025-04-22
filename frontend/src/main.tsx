import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { StrictMode } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import NoticeDisplayContextProvider from "./Context/NoticeDisplayContextProvider.tsx";
import AppProviders from "./Context/AppContextProvider.tsx";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "./Components/ErrorBoundaryFallback.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider
      clientId={`${import.meta.env.VITE_GOOGLE_AUTH_CLIENTID}`}
    >
      <NoticeDisplayContextProvider>
        <AppProviders>
          <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
            <App />
          </ErrorBoundary>
        </AppProviders>
      </NoticeDisplayContextProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
