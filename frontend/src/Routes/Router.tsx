import {
  createBrowserRouter,
  Route,
  createRoutesFromElements,
} from "react-router-dom";
import NotFoundPage from "../Components/NotFoundPage";
import CreateWordSet from "../Components/CreateWordSet";
import FetchLib from "../Components/FetchWrapper/FetchLib";
import IsLogInRoute from "../Routes/IsLogInRoute";
import ToLogIn from "../Components/ToLogIn";
import FetchWordSet from "../Components/FetchWrapper/FetchWordSet";
import FetchMail from "../Components/FetchWrapper/FetchMail";
import SettingUser from "../Components/SettingUser";
import FetchWords from "../Components/FetchWrapper/FetchWords";
import FullWordCard from "../Components/FullWordCard";
import MultiChoice from "../Components/MultiChoice";
import Cloze from "../Components/Cloze";
import FetchWordSetCard from "../Components/FetchWrapper/FetchWordSetCard";
import FetchRecentVisit from "../Components/FetchWrapper/FetchRecentVisit";
import CreateFeedback from "../Components/CreateFeedback";
import FetchFeedbackCard from "../Components/FetchWrapper/FetchFeedbackCard";

import ForgetPassword from "../Components/ForgetPassword";
import ActivateEmail from "../Components/ActivateEmail";
import { ErrorBoundary } from "react-error-boundary";
import ErrorBoundaryFallback from "../Components/ErrorBoundaryFallback";
import App from "../App";
export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="activateEmail/:token" element={<ActivateEmail />} />
      <Route
        path="/"
        element={
          <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
            <App />
          </ErrorBoundary>
        }
      >
        {/* index route can't have path */}
        <Route index element={<FetchRecentVisit />} />
        <Route path="toLogIn" element={<ToLogIn />}></Route>
        <Route
          path="wordSet/:wordSetID"
          element={<FetchWordSet mode={true} />}
        />
        <Route path="/searchWordSet" element={<FetchWordSetCard />} />
        <Route path="/allFeedbacks" element={<FetchFeedbackCard />} />
        <Route path="/forgetPassword" element={<ForgetPassword />} />
        {/* protected route wrapper的寫法，用IsLogInRoute去包需要login才能看得route */}
        {/* 並把ErrorBoundary放在裡面 */}
        <Route element={<IsLogInRoute />}>
          {/* prevent non-logged in users */}
          <Route path="setting" element={<SettingUser />}></Route>
          <Route path="myLib" element={<FetchLib />} />
          <Route path="lib/:userID" element={<FetchLib />} />
          <Route path="createWordSet" element={<CreateWordSet />} />
          <Route
            path="editWordSet/:wordSetID"
            element={<FetchWordSet mode={false} />}
          />
          <Route path="mailBox" element={<FetchMail />} />
          <Route path="createFeedback" element={<CreateFeedback />} />
          <Route path="game/:wordSetID" element={<FetchWords />}>
            <Route path="wordCard" element={<FullWordCard />} />
            <Route path="multiChoice" element={<MultiChoice />} />
            <Route path="cloze" element={<Cloze />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </>,
  ),
);
