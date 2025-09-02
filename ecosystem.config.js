module.exports = {
  apps: [{
    name: 'family-planner',
    script: './server/index.js',
    cwd: '/Users/scottkaufman/Dropbox/01. Personal Master Folder/30-39 Music, Coding & Creative/38 Coding Projects/family-planner',
    env: {
      PORT: 11001,
      NODE_ENV: 'production'
    },
    env_development: {
      PORT: 11001,
      NODE_ENV: 'development'
    },
    watch: false,
    instances: 1,
    autorestart: true,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}