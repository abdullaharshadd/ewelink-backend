import cron from 'node-cron';
import { fetchAndSaveEnergyConsumptionData } from '../src/helpers/ewelink.helper.js'; 

const retrieveEnergyConsumptionJob = async () => {
    try {
        // Run the function immediately for the first execution
        console.log('Running initial execution of energy consumption job at:', new Date().toLocaleString());
        await fetchAndSaveEnergyConsumptionData();

        // Set up the cron job to run every hour
        cron.schedule('0 * * * *', async () => {
            console.log('Running scheduled cron job at:', new Date().toLocaleString());
            await fetchAndSaveEnergyConsumptionData();
        });

        console.log('Cron job scheduled to run every hour.');
    } catch (error) {
        console.error('Error during energy consumption job initialization:', error.message);
    }
};

export default retrieveEnergyConsumptionJob;
