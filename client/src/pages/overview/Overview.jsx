import { useAuth } from '../../context/AuthContext.jsx';
import StudentOverview from './StudentOverview.jsx';
import ProfessorOverview from './ProfessorOverview.jsx';
import AdminOverview from './AdminOverview.jsx';

export default function Overview() {
  const { role } = useAuth();
  if (role === 'STUDENT') return <StudentOverview />;
  if (role === 'PROFESSOR') return <ProfessorOverview />;
  return <AdminOverview />;
}
