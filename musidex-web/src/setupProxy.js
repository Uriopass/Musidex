const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
    app.use(
        createProxyMiddleware('/api',{
            target: 'http://localhost:3200',
            changeOrigin: true,
        })
    );
    app.use(
        createProxyMiddleware('/storage',{
            target: 'http://localhost:3200',
            changeOrigin: true,
        })
    );
    app.use(
        createProxyMiddleware('/api/metadata/ws', {
            target: 'ws://localhost:3200',
            ws: true,
            changeOrigin: true,
        })
    );
};