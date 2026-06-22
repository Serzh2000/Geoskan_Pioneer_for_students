import { startServer } from './server.js';

startServer({
    port: 3000,
    packaged: false
}).catch((error) => {
    console.error('Failed to start dev server:', error);
    process.exit(1);
});
