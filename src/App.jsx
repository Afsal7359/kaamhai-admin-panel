import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import ResourcePage from "./components/ResourcePage";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Employers from "./pages/Employers";
import JobPosts from "./pages/JobPosts";
import OfferLetters from "./pages/OfferLetters";
import Verifications from "./pages/Verifications";
import Payments from "./pages/Payments";
import PointRewards from "./pages/PointRewards";
import ApiLogs from "./pages/ApiLogs";

function Protected({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="employers" element={<Employers />} />
        <Route path="job-posts" element={<JobPosts />} />
        <Route path="offer-letters" element={<OfferLetters />} />
        <Route path="verifications" element={<Verifications />} />
        <Route path="payments" element={<Payments />} />
        <Route path="point-rewards" element={<PointRewards />} />
        <Route path="api-logs" element={<ApiLogs />} />
        {/* Every database collection, in its own place — see src/resources.js */}
        <Route path="r/:model" element={<ResourcePage />} />
        {/* Back-compat with old database URLs */}
        <Route path="database/:model" element={<ResourcePage />} />
        <Route path="database" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
