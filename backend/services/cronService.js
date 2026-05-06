const cron = require('node-cron');
const ticketRepository = require('../repositories/ticketRepository');
const db = require('../config/db');

// Run every minute
cron.schedule('* * * * *', async () => {
    try {
        console.log('Running ticket expiration check...');
        const expired = await ticketRepository.deleteExpiredTickets();
        if (expired.length > 0) {
            console.log(`Released ${expired.length} expired tickets.`);
        }
    } catch (error) {
        console.error('Error in cron job:', error);
    }
});
