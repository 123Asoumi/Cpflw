import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import { LogoIcon } from './components/layout/Logo.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/overview/Overview.jsx';
import Courses from './pages/Courses.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import Grades from './pages/grades/Grades.jsx';
import Timetable from './pages/Timetable.jsx';
import Activities from './pages/Activities.jsx';
import ActivityDetail from './pages/ActivityDetail.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';
import Students from './pages/admin/Students.jsx';
import StudentDetail from './pages/admin/StudentDetail.jsx';
import Professors from './pages/admin/Professors.jsx';
import ProfessorDetail from './pages/admin/ProfessorDetail.jsx';
import Classes from './pages/admin/Classes.jsx';
import ClassDetail from './pages/admin/ClassDetail.jsx';
import Reports from './pages/admin/Reports.jsx';
import { NotFound, Forbidden } from './pages/Errors.jsx';

function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center" role="status" aria-label="Chargement">
        <LogoIcon size={44} className="animate-pulse" />
      </div>
    );
  }
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

/** Route guard by role — the API enforces the same rules server-side. */
function Role({ allow, children }) {
  const { role } = useAuth();
  return allow.includes(role) ? children : <Forbidden />;
}

function LoginRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'authenticated') return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  return <Login />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<Overview />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CourseDetail />} />
        <Route path="grades" element={<Grades />} />
        <Route path="timetable" element={<Timetable />} />
        <Route path="activities" element={<Activities />} />
        <Route path="activities/:id" element={<ActivityDetail />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="students" element={<Role allow={['ADMIN', 'PROFESSOR']}><Students /></Role>} />
        <Route path="students/:id" element={<Role allow={['ADMIN', 'PROFESSOR']}><StudentDetail /></Role>} />
        <Route path="professors" element={<Role allow={['ADMIN']}><Professors /></Role>} />
        <Route path="professors/:id" element={<Role allow={['ADMIN']}><ProfessorDetail /></Role>} />
        <Route path="classes" element={<Role allow={['ADMIN']}><Classes /></Role>} />
        <Route path="classes/:id" element={<Role allow={['ADMIN']}><ClassDetail /></Role>} />
        <Route path="reports" element={<Role allow={['ADMIN']}><Reports /></Role>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
