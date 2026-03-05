import { io } from 'socket.io-client';

const URL = "localhost:5500"

export const socket = io(URL);