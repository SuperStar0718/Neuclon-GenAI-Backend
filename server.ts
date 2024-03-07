import express, { Express, Request, Response, Application } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { connectDB } from "./config/db";
import Connect from "./routes/api/Connect";
import Copilot from "./routes/api/Copilot";

console.log("environment    ", process.env.ENVIRONMENT);
console.log("PORT    ", process.env.PORT);
console.log("MONGO_CONNECTION_STRING    ", process.env.mongoURI);
if (process.env.ENVIRONMENT !== "production") {
  require("dotenv").config();
}

connectDB();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());
app.use((req: Request, res: Response, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );
  next();
});

// Routes
app.use("/api", Connect);
app.use("/chatgpt", Copilot);

app.listen(port, () => {
  console.log(`Server listening on the port  ${port}`);
});
