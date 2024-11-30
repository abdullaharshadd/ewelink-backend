import cron from 'node-cron';
import { closeWindowsConditionally } from '../src/helpers/ewelink.helper.js'; 

const closeWindowsConditionallyJob = async () => {
    try {

        // Set up the cron job to run every minute
        cron.schedule('*/1 * * * *', async () => {
            console.log('Running scheduled Close windows cron job at:', new Date().toLocaleString());
            await closeWindowsConditionally();
        });

        console.log('Close windows Cron job scheduled to run every hour.');
    } catch (error) {
        console.error('Error during Close windows job initialization:', error.message);
    }
};

export default closeWindowsConditionallyJob;
