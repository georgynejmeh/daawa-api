import express from "express";
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send({ message: "Hello World!" });
});

app.listen(port, () => {
  console.log(`Running... http://localhost:${port}`);
});

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
app.get("/users", async (req, res) => {
  const allUsers = await prisma.user.findMany();
  res.send({ data: allUsers });
});
