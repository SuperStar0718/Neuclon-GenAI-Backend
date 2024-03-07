import { Router } from "express";
import dotenv from "dotenv";
import {
  generateResponseFromChatGPT,
  sendMessage,
  downloadFile,
} from "../../services/CopilotService";

dotenv.config();
const Copilot = Router();

/*
 * @route  POST copilot/generateResponseFromChatGPT
 * @desc   generate response from chatGPT
 * @access Public
 */
Copilot.post("/generateResponseFromChatGPT/", async (req, res) => {
  try {
    const chatCompletion = await generateResponseFromChatGPT(req, res);
    res.json(chatCompletion);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

/*
 * @route  POST copilot/sendMessage
 * @desc   send message
 * @access Public
 */
Copilot.post("/sendMessage", async (req, res) => {
  try {
    const messages = req.body;
    const id = sendMessage(messages);
    res.json({ id }); // Send the id to the client
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

/*
 * @route  GET copilot/downloadFile
 * @desc   download file
 * @access Public
 */
Copilot.get("/downloadFile/:id", async (req, res) => {
  try {
    await downloadFile(req, res);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

export default Copilot;
