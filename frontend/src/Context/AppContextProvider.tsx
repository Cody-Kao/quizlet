import NoticeDisplayContextProvider, {
  useNoticeDisplayContextProvider,
} from "./NoticeDisplayContextProvider";
import LogInContextProvider from "./LogInContextProvider";
import { ReactElement } from "react";

function AppProviders({
  children,
}: {
  children: ReactElement | ReactElement[];
}) {
  return (
    <NoticeDisplayContextProvider>
      <AppCombinedProvider>{children}</AppCombinedProvider>
    </NoticeDisplayContextProvider>
  );
}

// This component connects the LoginProvider with the notification callback.
function AppCombinedProvider({
  children,
}: {
  children: ReactElement | ReactElement[];
}) {
  // Get the notification context, available because NotificationProvider is higher up.
  const { setNotice } = useNoticeDisplayContextProvider();

  return (
    <LogInContextProvider setNotice={setNotice}>
      {children}
    </LogInContextProvider>
  );
}

export default AppProviders;
