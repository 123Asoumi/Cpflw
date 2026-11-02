import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GraduationCap, ClipboardList, FolderOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { PageHeader, Tabs } from '../../components/ui/index.js';
import MyGrades from './MyGrades.jsx';
import Gradebook from './Gradebook.jsx';
import GradeRecords from './GradeRecords.jsx';

export default function Grades() {
  const { role } = useAuth();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('course') ? 'gradebook' : 'records');

  if (role === 'STUDENT') return <MyGrades />;
  if (role === 'PROFESSOR') {
    return (
      <>
        <PageHeader icon={ClipboardList} title="Gestion des notes" description="Choisissez un cours, créez des évaluations et saisissez les notes de vos étudiants." />
        <Gradebook />
      </>
    );
  }
  return (
    <>
      <PageHeader icon={GraduationCap} title="Notes & dossiers académiques" description="Consultez les résultats de l’établissement et gérez les carnets de notes." />
      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'records', label: 'Dossiers académiques', icon: FolderOpen },
          { value: 'gradebook', label: 'Carnets de notes', icon: ClipboardList },
        ]}
      />
      {tab === 'records' ? <GradeRecords /> : <Gradebook />}
    </>
  );
}
