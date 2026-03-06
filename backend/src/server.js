const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const tasksRouter = require("./routes/tasks");
const tagsRouter = require("./routes/tags");
const eventsRouter = require("./routes/events");
const shoppingRouter = require("./routes/shopping");
const goalsRouter = require("./routes/goals");

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
app.use("/api/events", eventsRouter);
app.use("/api/shopping", shoppingRouter);
app.use("/api/goals", goalsRouter);

const distPath = path.join(__dirname, "..", "frontend-dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "server error" });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});
