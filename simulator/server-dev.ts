import { startServer } from './server.js';

startServer({
    port: 3010,
    host: '127.0.0.1',
    vitePort: 3011,
    packaged: false,
    serveStaticUi: false
}).catch((error) => {
    console.error('Failed to start dev server:', error);
    process.exit(1);
});
