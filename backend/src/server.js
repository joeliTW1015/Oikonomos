const express = require("express");
const cors = require("cors");

const tasksRouter = require("./routes/tasks");
const tagsRouter = require("./routes/tags");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.status(200).send(
    "<html><body style=\"font-family: sans-serif;\">" +
      "<h1>Oikonomos API</h1>" +
      "<p>Frontend dev server: <a href=\"http://localhost:5173\">http://localhost:5173</a></p>" +
      "</body></html>"
  );
});

app.use("/api/tasks", tasksRouter);
app.use("/api/tags", tagsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "server error" });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
