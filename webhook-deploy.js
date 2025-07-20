const express = require('express');
const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const SECRET = process.env.WEBHOOK_SECRET || 'your-secret-here';

app.post('/deploy', (req, res) => {
    // Проверяем GitHub signature
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    const expected = `sha256=${crypto.createHmac('sha256', SECRET).update(payload).digest('hex')}`;
    
    if (signature !== expected) {
        return res.status(401).send('Unauthorized');
    }
    
    // Деплоим
    console.log('🚀 Starting deployment...');
    
    exec('cd /var/www/fonana && git pull origin main && npm ci && npm run build && pm2 reload fonana', 
        (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Deployment failed:', error);
                return res.status(500).send('Deployment failed');
            }
            
            console.log('✅ Deployment successful');
            console.log(stdout);
            res.send('Deployment successful');
        }
    );
});

app.listen(9000, () => {
    console.log('🪝 Webhook server running on port 9000');
});

module.exports = app; 