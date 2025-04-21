/* 
傳統的class component based，但無法處理非rendering部分的error，以及async based的error

import { Component, ErrorInfo, ReactNode } from "react";
import { v4 as uuid } from "uuid";
import { postRequest } from "../Utils/postRequest";
import { PATH } from "../Consts/consts";
import { LogErrorRequest } from "../Types/request";
import { useLogInContextProvider } from "../Context/LogInContextProvider";
import { formatTimeToSeconds } from "../Utils/utils";



export default function ErrorBoundary({ children }: { children: ReactNode }) {
  const { user } = useLogInContextProvider();
  return (
    <ErrorBoundaryClass userID={user?.id || ""}>{children}</ErrorBoundaryClass>
  );
}

type Props = {
  children: ReactNode;
  userID: string;
};

type State = {
  hasError: boolean;
  errorID: string;
};

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorID: uuid(),
    };
  }

  static getDerivedStateFromError(): Partial<State> {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const digest = errorInfo.digest ?? "";
    const stack = errorInfo.componentStack ?? "";

    postRequest(`${PATH}/logError`, {
      userID: this.props.userID,
      errorID: this.state.errorID,
      error: error.message,
      errorInfo: `${digest}\n${stack}`, // Combine with newline for readability
      time: formatTimeToSeconds(Math.floor(Date.now() / 1000)),
    } as LogErrorRequest);
    alert("send error");
  }

  render() {
    if (this.state.hasError) {
      return <></>;
    }

    return this.props.children;
  }
}
 */
