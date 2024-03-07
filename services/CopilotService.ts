import fs from "fs";
import { promises as fs_promises } from "fs";
import path from "path";
import Connection from "../models/Connection";
import mssql from "mssql";
import { Client } from "pg";
import { MongoClient } from "mongodb";
import { createObjectCsvWriter as createCsvWriter } from "csv-writer";
import moment from "moment-timezone";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

// Create an instance of the OpenAI API client
const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], // defaults to process.env["OPENAI_API_KEY"]
});

let messageMap = new Map();
let thread_id: any = null;
const OPENAI_ASSISTANT_ID = process.env["OPENAI_ASSISTANT_ID"] || "";

/**
 *
 *
 * @export
 * @param {string} msg
 * @return {*}
 */
export async function Chat(msg: string) {
  //upload database file
  const file_id = await uploadFile();
  let myAssistant;
  //modify assistant with this database file
  try {
    myAssistant = await openai.beta.assistants.update(OPENAI_ASSISTANT_ID, {
      file_ids: file_id,
    });
  } catch (err) {
    console.log("error:", err);
    myAssistant = await openai.beta.assistants.update(OPENAI_ASSISTANT_ID, {
      file_ids: ["file-EnnrF8UFZYzCPFPRabG7ag2k"],
    });
  }
  let myThread = null;
  if (thread_id) {
    myThread = await openai.beta.threads.retrieve(thread_id);
  } else {
    myThread = await openai.beta.threads.create();
    thread_id = myThread.id;
  }
  const message = await openai.beta.threads.messages.create(myThread.id, {
    role: "user",
    content: msg,
  });
  const run = await openai.beta.threads.runs.create(myThread.id, {
    assistant_id: myAssistant.id,
  });

  await waitOnRun(myThread, run);
  const threadMessages = await openai.beta.threads.messages.list(myThread.id, {
    order: "asc",
    after: message.id,
  });
  let result = "";
  for (let i = 0; i < threadMessages.data[0].content.length; i++) {
    let message = threadMessages.data[0].content[i];

    // threadMessages.data[0].content.forEach(async message => {
    if (message.type == "text") {
      const annotations = message.text.annotations;
      let messageContent = message.text;
      let citations: any = [];
      try {
        for (let index = 0; index < annotations.length; index++) {
          if (annotations.length == 0) break;
          let annotation = annotations[index];
          //Replace the text with a footnote
          if ("file_path" in annotation) {
            const file_id = annotation.file_path.file_id;
            await openai.files.retrieve(file_id).then((citedFile) => {
              citations.push(
                `[${index}] Click <here> to download ${citedFile.filename}`
              );
              const fileName = path.basename(citedFile.filename);
              messageContent.value = messageContent.value.replace(
                /\[([^[\]]+)\]\(sandbox:\/mnt\/data\/([^)]+)\)/g,
                "</pre><a href='#' class='" +
                  file_id +
                  " " +
                  fileName +
                  "' >$1</a><pre>"
              );
            });
          }

          // Gather citations based on annotation attributes
          if ("file_citation" in annotation) {
            const quote = annotation.file_citation.quote;
            await openai.files
              .retrieve(annotation.file_citation.file_id)
              .then((citedFile) => {
                citations.push(
                  `[${index}] ${quote} from ${citedFile.filename}`
                );
              });
          } else if ("file_path" in annotation) {
            const fild_id = annotation.file_path.file_id;
            await openai.files
              .retrieveContent(annotation.file_path.file_id)
              .then(async (file_content) => {
                fs.writeFile(
                  "./download_files/" + fild_id,
                  file_content,
                  { flag: "wx" },
                  (err) => {
                    if (err) {
                      if (err.code === "EEXIST") {
                        console.error("File already exists:", fild_id);
                      } else {
                        console.error("Error creating the file:", err);
                      }
                    } else {
                    }
                  }
                );

                // Note: File download functionality not implemented above for brevity
              });
          }
        }
      } catch (error) {
        console.log("error: ", error);
      }
      result += "<pre class='whitespace-pre-wrap'>" + messageContent.value;
      ("</pre>");
    }
    if (message.type == "image_file") {
      const response = await openai.files.content(message.image_file.file_id);
      // Extract the binary data from the Response object
      const image_data = await response.arrayBuffer();

      // Convert the binary data to a Buffer
      const image_data_buffer = Buffer.from(image_data);

      // Convert the Buffer to a base64 string
      const base64Image = image_data_buffer.toString("base64");
      result += "<img src='data:image/jpeg;base64," + base64Image + "'/>";
    }
  }
  return result;
}

export /**
 *
 *
 * @param {*} thread
 * @param {*} run
 * @return {*}
 */
const waitOnRun = async (thread: any, run: any) => {
  while (run.status == "queued" || run.status == "in_progress") {
    // Assuming `client.beta.threads.runs.retrieve` is an async function
    run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    // Sleep for 0.5 seconds
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return run;
};

/**
 *
 *
 * @export
 * @return {*}
 */
export async function uploadFile() {
  let file_ids = [];
  const dirPath = path.join(process.cwd(), "dataFiles");

  try {
    const files = fs.readdirSync(dirPath);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Use 'path.join' to get the full file path
      let fullPath = `${dirPath}\\${file}`;

      // Check if the path is a file
      if (fs.statSync(fullPath).isFile()) {
        const response = await openai.files.create({
          file: fs.createReadStream(fullPath),
          purpose: "assistants",
        });
        file_ids.push(response.id);
      }
    }
  } catch (err) {
    console.error("Error reading directory:", err);
  }
  return file_ids;
}

/**
 *
 *
 * @export
 * @param {*} selectedDataset
 * @return {*}
 */
export async function getAllDataFromDB(selectedDataset: any) {
  let data = [];
  const parentDir = path.resolve(__dirname, "..");
  selectedDataset = JSON.parse(selectedDataset);
  for (let i = 0; i < selectedDataset.length; i++) {
    const dataset = selectedDataset[i];
    let client, sampleData, headers, csvWriter;
    const connection = await Connection.findOne({
      status: "connected",
      type: dataset.db_type,
    });
    switch (dataset.db_type) {
      case "MongoDB":
      case "QuickBooks":
      case "SAP":
      case "Tulip":
      case "MasterControl":
      case "FedEx":
      case "ADP":
        if (connection?.uri) {
          client = new MongoClient(connection.uri, {});
        } else {
          client = new MongoClient(
            `mongodb+srv://${connection?.username}:${connection?.password}@${connection?.host}`,
            {}
          );
        }
        await client.connect();
        const db = client.db(dataset.db_name);
        const collection = db.collection(dataset.name);
        // Get all collectionData in the current collection
        const collectionData = await collection.find().toArray();
        data = collectionData;
        // Format Timestamp field in each document
        data.forEach((doc) => {
          if (doc.Timestamp) {
            // Adjust the format here
            doc.Timestamp = moment(doc.Timestamp).format(
              "YYYY-MM-DDTHH:mm:ss.SSSZ"
            );
          }
        });

        // Fetch a single document to determine fields
        sampleData = await collection.findOne({});
        if (!sampleData) {
          continue;
        }

        // Extract field names (keys) for CSV headers except for only _id field.
        headers = Object.keys(sampleData)
          .map((key) => ({ id: key, title: key }))
          .filter((header) => header.id !== "_id");

        // Configure CSV writer
        csvWriter = createCsvWriter({
          path: path.join(parentDir, "dataFiles", `${dataset.name}.csv`),
          header: headers,
        });
        // Modify each record
        data = data.map((record) => {
          // Convert empty values to null
          Object.keys(record).forEach((key) => {
            if (!record[key]) {
              record[key] = "null";
            }
          });
          // Add an extra field with a null value for the trailing comma
          return { ...record };
        });
        // Write data to CSV
        await csvWriter.writeRecords(data);
        client.close();
        console.log(
          "CSV file written successfully:",
          path.join(parentDir, "dataFiles", `${dataset.name}.csv`)
        );
        break;
      case "PostgreSQL":
        client = new Client({
          user: connection?.username,
          host: connection?.host,
          password: connection?.password,
        });
        await client.connect();
        const res = await client.query("SELECT * FROM public." + dataset.name);
        data = res.rows;
        // Format Timestamp field in each document
        data.forEach((doc) => {
          if (doc.Timestamp) {
            // Adjust the format here
            doc.Timestamp = moment(doc.Timestamp).format(
              "YYYY-MM-DDTHH:mm:ss.SSSZ"
            );
          }
        });

        // Fetch a single document to determine fields
        if (!data[0]) {
          continue;
        }

        // Extract field names (keys) for CSV headers except for only _id field.
        headers = Object.keys(data[0])
          .map((key) => ({ id: key, title: key }))
          .filter((header) => header.id !== "_id");

        // Configure CSV writer
        csvWriter = createCsvWriter({
          path: path.join(parentDir, "dataFiles", `${dataset.name}.csv`),
          header: headers,
        });
        // Modify each record
        data = data.map((record) => {
          // Convert empty values to null
          Object.keys(record).forEach((key) => {
            if (!record[key]) {
              record[key] = "null";
            }
          });
          // Add an extra field with a null value for the trailing comma
          return { ...record };
        });
        // Write data to CSV
        await csvWriter.writeRecords(data);
        console.log("CSV file written successfully");
        break;
      case "mssql":
        client = await mssql.connect({
          user: connection?.username,
          password: connection?.password,
          server: connection?.host ?? "",
        });
        const result = await client.query`SELECT * FROM TraningData`;
        client.close();
        data = data.concat(result.recordset);
        break;
    }
  }

  return data;
}

export /**
 *
 *
 * @param {string} dirPath
 */
const removeAllFilesInFolder = (folderName: string) => {
  try {
    const dirPath = path.join(process.cwd(), folderName);
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      console.log("filePath:", filePath);
      const fileStat = fs.statSync(filePath);

      if (fileStat.isFile()) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    console.error("Error while deleting files:", err);
  }
};

export /**
 *
 *
 * @param {string} dirPath
 */
const addCommaEndOfLine = async (folderName: string) => {
  try {
    const dirPath = path.join(process.cwd(), folderName);

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const fileStat = fs.statSync(filePath);

      if (fileStat.isFile()) {
        // Read the file
        const content = await fs_promises.readFile(filePath, "utf8");
        const lines = content.split("\n");
        lines.pop(); // Remove the last line
        const modifiedContent = lines
          .map((line, index) => {
            // Add a comma only if it's not the last line
            return index === 0 ? line : line + ",";
          })
          .join("\n");

        // Rewrite the file
        await fs_promises.writeFile(filePath, modifiedContent, "utf8");
      }
    }
  } catch (err) {
    console.error("Error while adding comma to files:", err);
  }
};

export /**
 *
 *
 * @param {*} req
 * @param {*} res
 * @return {*}
 */
const generateResponseFromChatGPT = async (req: any, res: any) => {
  removeAllFilesInFolder("dataFiles");
  const request = req.body;
  if (!request) {
    res.status(404).send("Not found");
    return;
  }

  if (request.selectedDataset) await getAllDataFromDB(request.selectedDataset);
  await addCommaEndOfLine("dataFiles");

  if (request.new) thread_id = null;
  const chatCompletion = await Chat(request.prompt);
  return chatCompletion;
};

export /**
 *
 *
 * @param {*} messages
 * @return {*}
 */
const sendMessage = async (messages: any) => {
  const id = Date.now().toString(); // Generate a unique id
  messageMap.set(id, messages); // Store the messages object in the map
  return id;
};

export const downloadFile = async (req: any, res: any) => {
  const fileId = req.params.id;

  await openai.files.retrieve(fileId).then((citedFile) => {
    const fileName = path.basename(citedFile.filename);
    const filePath = "./download_files/" + fileId;
    if (fs.existsSync(filePath)) {
      // Set the appropriate headers for the file download
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
      res.setHeader("Content-Type", "application/octet-stream");

      // Create a read stream from the file
      const fileStream = fs.createReadStream(filePath);

      // Pipe the file stream to the response object
      fileStream.pipe(res);
    } else {
      res.status(404).send("File not found");
    }
  });
};
