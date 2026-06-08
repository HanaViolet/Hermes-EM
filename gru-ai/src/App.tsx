import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useWebSocket } from '@/hooks/useWebSocket';

function Initializers() {
  useWebSocket();
  return null;
}

export default function App() {
  return (
    <>
      <Initializers />
      <RouterProvider router={router} />
    </>
  );
}
