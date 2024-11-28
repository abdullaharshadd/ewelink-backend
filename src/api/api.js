import express from "express";
import { getData } from "../../data.js";
import { changeStatus, fetchAndSaveEnergyConsumptionData } from "../helpers/ewelink.helper.js";
const app = express();

// Middleware to parse JSON requests
app.use(express.json());

app.get("/devices-info", async (req, res) => {
  try {
    const { latestRequired } = req.query;
    console.log(latestRequired);
    if (latestRequired) {
      await fetchAndSaveEnergyConsumptionData();
    }
    return res.status(200).json(getData());
  } catch (error) {
    console.error("Error in /devices-info:", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  } finally {
    console.log("Request completed.");
  }
});

app.put("/change-device-status", async (req, res) => {
  try {
    const { deviceId, status, deviceType } = req.body;
    const result = await changeStatus(deviceId, status, deviceType);
    if (result === null) {
      return res.status(500).send({message : "Couldn't access eWeLink service"});
    }
    if (result.error === 0) {
      return res.status(200).send({message : "Device status updated successfully"});
    } else {
      return res.status(200).send({message : "Device status not updated successfully. Most probably the device is offline."});
    }
  } catch (error) {
    console.error("Error in /change-device-status:", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  } finally {
    console.log("Request completed.");
  }
});

export default app;
