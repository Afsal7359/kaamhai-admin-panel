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
import AccessManager from "./pages/AccessManager";
import AccessDenied from "./components/AccessDenied";

function Protected({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// Gate a curated page behind a "view" permission.
function Guard({ resource, children }) {
  const { can } = useAuth();
  if (!can(resource, "view")) return <AccessDenied />;
  return children;
}

function SuperGuard({ children }) {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin) return <AccessDenied />;
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
        <Route index element={<Guard resource="dashboard"><Dashboard /></Guard>} />
        <Route path="employees" element={<Guard resource="employees"><Employees /></Guard>} />
        <Route path="employers" element={<Guard resource="employers"><Employers /></Guard>} />
        <Route path="job-posts" element={<Guard resource="job-posts"><JobPosts /></Guard>} />
        <Route path="offer-letters" element={<Guard resource="offer-letters"><OfferLetters /></Guard>} />
        <Route path="verifications" element={<Guard resource="verifications"><Verifications /></Guard>} />
        <Route path="payments" element={<Guard resource="payments"><Payments /></Guard>} />
        <Route path="point-rewards" element={<Guard resource="point-rewards"><PointRewards /></Guard>} />
        <Route path="api-logs" element={<Guard resource="api-logs"><ApiLogs /></Guard>} />
        <Route path="access" element={<SuperGuard><AccessManager /></SuperGuard>} />
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
