import { reset } from './index.js';
import { DEMO_ACCOUNTS } from './seed.js';

reset();
console.log('Données de démonstration régénérées (server/data/store.json).');
console.table(Object.entries(DEMO_ACCOUNTS).map(([role, a]) => ({ role, ...a })));
