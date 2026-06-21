module.exports = {
    apps: [
        {
            name: 'teslatech_baileys',
            cwd: __dirname,
            script: 'index.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production',
                PORT: 3003,
                DEFAULT_SESSION: 'teslatech_session',
                SESSIONS_DIR: './sessions',
            },
        },
    ],
};
