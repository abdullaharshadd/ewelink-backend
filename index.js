import "dotenv/config";
import app from "./src/api/api.js";
import retrieveEnergyConsumptionJob from "./jobs/retrieveEnergyConsumption.job.js";
import { createTables } from "./src/helpers/database.helper.js";
const PORT = process.env.PORT || 3000;
import closeWindowsConditionallyJob from "./jobs/closeWindows.job.js";

const startServer = async () => {
  try {
    console.log("Starting energy consumption job...");

    createTables();
    
    // Ensure the job runs before the server starts
    await retrieveEnergyConsumptionJob(); // Pass a flag to indicate first-run execution
    
    await closeWindowsConditionallyJob();

    console.log("Energy consumption job completed. Starting server...");
    
    console.log("Created database tables successfully");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error during startup:", error.message);
    process.exit(1); // Exit process on critical error
  }
};

startServer();
