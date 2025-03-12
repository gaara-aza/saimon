function checkRequiredEnvVars() {
    const required = ['DATABASE_URL', 'NODE_ENV'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('Missing required environment variables:', missing);
        console.log('Available environment variables:', Object.keys(process.env));
        if (process.env.NODE_ENV === 'production') {
            console.error('Critical environment variables missing in production!');
        }
    } else {
        console.log('All required environment variables are set');
    }
}

module.exports = checkRequiredEnvVars; 