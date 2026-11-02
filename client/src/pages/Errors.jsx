import { Link } from 'react-router-dom';
import { Compass, ShieldAlert } from 'lucide-react';
import { EmptyState, Button } from '../components/ui/index.js';

export function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Page introuvable"
      message="Cette page n’existe pas ou a été déplacée."
      action={<Link to="/"><Button variant="primary">Retour à l’accueil</Button></Link>}
    />
  );
}

export function Forbidden() {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="Accès refusé"
      message="Votre rôle ne vous permet pas d’accéder à cette page."
      action={<Link to="/"><Button>Retour à l’accueil</Button></Link>}
    />
  );
}
