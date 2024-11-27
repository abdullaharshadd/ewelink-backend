import express from "express";
import { getData } from "../../data.js";
const app = express();

// Middleware to parse JSON requests
app.use(express.json());

app.get("/devices-info", async (req, res) => {
  try {
    return res.status(200).json(getData());
  } catch (error) {
    console.error("Error in /devices-info:", error.message);
    return res.status(500).json({ message: "Something went wrong" });
  } finally {
    console.log("Request completed.");
  }
});

export default app;
