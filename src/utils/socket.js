import { io } from 'socket.io-client';

export const initSocket = async () => {
  const options = {
    'force new connection': true,
    reconnectionAttempt: 'Infinity',
    timeout: 10000,
    transports: ['websocket', 'polling'],
  };
  const backendUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
  return io(backendUrl || window.location.origin, options);
};
