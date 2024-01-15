const OpenAI = require("openai");
const express = require("express");
const fs = require("fs");
const fs_promises = require("fs").promises;
const path = require("path");
const db = require("../../database/database");
const Connection = require("../../models/Connection");
const mongoose = require("mongoose");
const mssql = require("mssql");
const { Client } = require("pg");
const { MongoClient } = require("mongodb");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const moment = require("moment-timezone");
const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], // defaults to process.env["OPENAI_API_KEY"]
});

let messageMap = new Map();
let thread_id = null;

async function Chat(msg) {
  //upload database file
  const file_id = await uploadFile();
  console.log("file_id:", file_id);
  let myAssistant;
  //modify assistant with this database file
  try {
    myAssistant = await openai.beta.assistants.update(
      process.env["OPENAI_ASSISTANT_ID"],
      {
        file_ids: file_id,
      }
    );
  } catch (err) {
    console.log("error:", err);
    myAssistant = await openai.beta.assistants.retrieve(
      process.env["OPENAI_ASSISTANT_ID"],
      {
        file_ids: ["file-EnnrF8UFZYzCPFPRabG7ag2k"],
      }
    );
  }
  console.log("myAssistant:", myAssistant);
  let myThread = null;
  if (thread_id) {
    myThread = await openai.beta.threads.retrieve(thread_id);
    console.log("myThread:", myThread);
  } else {
    myThread = await openai.beta.threads.create();
    thread_id = myThread.id;
    console.log("emptyThread:", myThread);
  }
  const message = await openai.beta.threads.messages.create(myThread.id, {
    role: "user",
    content: msg,
  });
  // console.log('message:', message);
  const run = await openai.beta.threads.runs.create(myThread.id, {
    assistant_id: myAssistant.id,
  });
  // console.log('run:', run);

  await waitOnRun(myThread, run);

  const threadMessages = await openai.beta.threads.messages.list(
    myThread.id,
    (order = "asc"),
    (after = message.id)
  );
  console.log("threadMessages content:", threadMessages.data[0].content);
  // console.log('threadMessages:', threadMessages);
  let result = "";
  for (let i = 0; i < threadMessages.data[0].content.length; i++) {
    let message = threadMessages.data[0].content[i];

    // threadMessages.data[0].content.forEach(async message => {
    if (message.type == "text") {
      console.log("text message:", message.text.value);
      console.log("annotations:", message.text.annotations);
      const annotations = message.text.annotations;
      let messageContent = message.text;
      let citations = [];
      try {
        for (let index = 0; index < annotations.length; index++) {
          if (annotations.length == 0) break;
          let annotation = annotations[index];
          console.log("annotation:", annotation);
          //Replace the text with a footnote

          await openai.files
            .retrieve(annotation.file_path.file_id)
            .then((citedFile) => {
              citations.push(
                `[${index}] Click <here> to download ${citedFile.filename}`
              );
              const fileName = path.basename(citedFile.filename);
              messageContent.value = messageContent.value.replace(
                /\[([^[\]]+)\]\(sandbox:\/mnt\/data\/([^)]+)\)/g,
                "</pre><a href='#' class='" +
                  annotation.file_path.file_id +" "+
                  fileName +
                  "' >$1</a><pre>"
              );
            });

          console.log("messagecontent.value: ", messageContent.value);

          // Gather citations based on annotation attributes
          if (annotation.file_citation) {
            await openai.files
              .retrieve(annotation.file_citation.file_id)
              .then((citedFile) => {
                citations.push(
                  `[${index}] ${annotation.file_citation.quote} from ${citedFile.filename}`
                );
              });
          } else if (annotation.file_path) {
            await openai.files
              .retrieveContent(annotation.file_path.file_id)
              .then(async (file_content) => {
                fs.writeFile(
                  "./download_files/" + annotation.file_path.file_id,
                  file_content,
                  { flag: "wx" },
                  (err) => {
                    if (err) {
                      if (err.code === "EEXIST") {
                        console.error(
                          "File already exists:",
                          annotation.file_path.file_id
                        );
                      } else {
                        console.error("Error creating the file:", err);
                      }
                    } else {
                      console.log(
                        "File created successfully:",
                        annotation.file_path.file_id
                      );
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
      console.log("citations:", citations);
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
      // console.log('base64Image:', base64Image);
      result += "<img src='data:image/jpeg;base64," + base64Image + "'/>";
    }
  }
  return result;
}

const waitOnRun = async (thread, run) => {
  while (run.status == "queued" || run.status == "in_progress") {
    // Assuming `client.beta.threads.runs.retrieve` is an async function
    run = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    // Sleep for 0.5 seconds
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  // console.log('after wait on run :', run);
  return run;
};

async function uploadFile() {
  let file_ids = [];
  try {
    const files = fs.readdirSync("dataFiles");
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Use 'path.join' to get the full file path
      let fullPath = path.join("dataFiles", file);

      // Check if the path is a file
      if (fs.statSync(fullPath).isFile()) {
        const response = await openai.files.create({
          file: fs.createReadStream(fullPath),
          purpose: "assistants",
        });
        console.log("upload file response:", response);
        file_ids.push(response.id);
      }
    }
  } catch (err) {
    console.error("Error reading directory:", err);
  }
  return file_ids;
}

async function getAllDataFromDB(selectedDataset) {
  let data = [];
  selectedDataset = JSON.parse(selectedDataset);
  console.log("selected Dataset", selectedDataset);
  for (let i = 0; i < selectedDataset.length; i++) {
    const dataset = selectedDataset[i];
    let client, sampleData, headers, csvWriter;
    const connection = await Connection.findOne({
      status: "connected",
      type: dataset.db_type,
    });

    switch (dataset.db_type) {
      case "mongodb":
        if (connection.uri) {
          client = new MongoClient(connection.uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
          });
        } else {
          client = new MongoClient(
            `mongodb+srv://${connection.username}:${connection.password}@${connection.host}/${connection.databaseName}`,
            {
              useNewUrlParser: true,
              useUnifiedTopology: true,
            }
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
          path: `dataFiles/${dataset.name}.csv`,
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
        // }
        // }
        // console.log('data:', data)
        break;
      case "postgre":
        client = new Client({
          user: connection.username,
          host: connection.host,
          database: connection.databaseName,
          password: connection.password,
          port: parseInt(connection.port),
        });
        await client.connect();
        const res = await client.query('SELECT * FROM public."SalesOrders"');
        // console.log('res:', res)
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
          path: `dataFiles/${dataset.name}.csv`,
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
          user: connection.username,
          password: connection.password,
          server: connection.host,
          database: connection.databaseName,
          port: parseInt(connection.port),
        });
        const result = await client.query`SELECT * FROM TraningData`;
        data = data.concat(result.recordset);
        break;
    }
  }

  return data;
}

const removeAllFilesInFolder = (dirPath) => {
  try {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const fileStat = fs.statSync(filePath);

      if (fileStat.isFile()) {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
      } else {
        console.log(`Skipping non-file: ${filePath}`);
      }
    }
  } catch (err) {
    console.error("Error while deleting files:", err);
  }
};

const addCommaEndOfLine = async (dirPath) => {
  try {
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
        await fs_promises.writeFile(
          filePath,
          modifiedContent,
          "utf8",
          (err) => {
            if (err) throw err;
            console.log("CSV file has been modified with trailing commas.");
          }
        );
        console.log(`Added comma to file: ${filePath}`);
      }
    }
  } catch (err) {
    console.error("Error while adding comma to files:", err);
  }
};

// @route  POST chatgpt/generateResponseFromChatGPT
// @desc   Register user
// @access Public

router.post("/generateResponseFromChatGPT/", async (req, res) => {
  removeAllFilesInFolder("dataFiles");
  try {
    const request = req.body;
    if (!request) {
      res.status(404).send("Not found");
      return;
    }
    // const list = await openai.files.list();

    // for await (const file of list) {
    //   console.log(file);
    //   await openai.files.del(file.id);
    // }
    await getAllDataFromDB(request.selectedDataset);
    await addCommaEndOfLine("dataFiles");

    console.log("user prompt:", request);
    if (request.new) thread_id = null;
    const chatCompletion = await Chat(request.prompt);
    // console.log("chatCompletion:", chatCompletion);
    res.json(chatCompletion);
  } catch (err) {
    console.log("error catch", err);
    res.status(500).json({ message: "Whoops, something went wrong." });
  }
});

// @route post chatgpt/sendMessage
// @desc send message to openAI
// @access public
router.post("/sendMessage", async (req, res) => {
  const messages = req.body;
  const id = Date.now().toString(); // Generate a unique id
  messageMap.set(id, messages); // Store the messages object in the map
  console.log(messageMap);
  res.json({ id }); // Send the id to the client
});

router.get("/downloadFile/:id", async (req, res) => {
  const fileId = req.params.id;

  await openai.files.retrieve(fileId).then((citedFile) => {
    const fileName = path.basename(citedFile.filename);
    const filePath = "./download_files/" + fileId;
    if (fs.existsSync(filePath)) {
      console.log("file exists");
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
    // Set the headers to suggest a file download with the original file name
    // res.download(filePath, fileName, (err) => {
    //     if (err) {
    //         // Handle error, but don't expose to the client
    //         console.error(err);
    //         res.status(500).send(
    //             "Error occurred while downloading the file."
    //         );
    //     }
    // });
  });
});

module.exports = router;
