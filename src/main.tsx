import {createRoot} from 'react-dom/client';
import Planner from './Planner';
import './styles.css';
const path=window.location.pathname.replace(/\/+$/,'');
createRoot(document.getElementById('root')!).render(<Planner admin={path.endsWith('/admin')||path.endsWith('/admin/index.html')}/>);
