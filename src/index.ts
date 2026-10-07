import app from "./app.js";

const port = process.env.PORT ?? 3000;

// This is split out so that we can test the app without starting the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
