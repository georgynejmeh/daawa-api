import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import multer from "multer";
import fs from "fs";

import express from "express";
const app = express();
const port = 3000;

import cors from "cors";
app.use(cors());

// var storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "public/uploads/");
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + path.extname(file.originalname)); //Appending extension
//   },
// });
var storage = multer.memoryStorage();
var upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.send({ message: "Hello World!" });
});

app.listen(port, () => {
  console.log(`Running... http://localhost:${port}`);
});

const prisma = new PrismaClient();
app.use(express.json());

app.use(express.static("public"));

/* TESTS */

app.post("/test/imgbb", upload.single("image"), async (req, res) => {
  try {
    const image = req.file;
    if (!image) {
      return res.status(400).json({ error: "no image" });
    }
    const formData = new FormData();
    // const imageBlob = new Blob([image.buffer], { type: image.mimetype });
    const imageBuffer = fs.readFileSync(image.path);
    const imageBlob = new Blob([imageBuffer], { type: image.mimetype });
    formData.append("key", process.env.IMGBB_API_KEY!);
    formData.append("image", imageBlob, image.filename);
    const response = await fetch(process.env.IMGBB_UPLOAD_URL!, {
      method: "POST",
      body: formData,
    });
    if (!response) {
      return res.status(400).json({ error: "no response from ibb" });
    }
    if (response.ok) {
      return res.status(201).json({ data: await response.json() });
    }
    const errorData = await response.json(); // Capture the error message from the response
    return res.status(400).json({
      error: `ImgBB API error: ${
        errorData.error ? errorData.error.message : "Unknown error"
      } CODE ${response.status}`,
    });
    // return res.status(500).json({
    //   error: `imageblob: ${imageBlob} CODE ${response.status} ERROR `,
    // });
  } catch (error) {
    return res.status(500).json({ error: error });
  }
});

/* USER CONTROLLER */

app.get("/users", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = 10;
  try {
    const allUsers = await prisma.user.findMany({
      skip: pageSize * (page - 1),
      take: pageSize * page,
    });
    const totalUsers = await prisma.user.count();
    res.json({ total: totalUsers, pageSize: pageSize, data: allUsers });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.post("/users", async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role,
      },
    });
    res.status(201).json({ data: newUser });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name, email, phone, password: hashedPassword, role },
    });
    res.status(201).json({ data: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.delete("/users", async (req, res) => {
  const { userIds } = req.body;
  try {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    res.json({ message: "Users deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

/* BUSINESS CONTROLLER */

app.get("/businesses", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = 10;
  try {
    const allBusinesses = await prisma.business.findMany({
      skip: pageSize * (page - 1),
      take: pageSize * page,
      include: { category: true, hours: true },
    });
    const totalBusinesses = await prisma.business.count();
    res.json({
      total: totalBusinesses,
      pageSize: pageSize,
      data: allBusinesses,
    });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.get("/businesses/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const business = await prisma.business.findUnique({
      where: { id },
      include: { category: true, hours: true, dishes: true, attributes: true },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }
    res.json({ data: business });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.post("/businesses", upload.single("image"), async (req, res) => {
  try {
    const { name, email, phone, address, description, categoryId } = req.body;
    const image = req.file;

    if (!image) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const formData = new FormData();
    const imageBlob = new Blob([image.buffer], { type: image.mimetype });
    formData.append("key", process.env.IMGBB_API_KEY!);
    formData.append("image", imageBlob, `${Date.now()}`);

    const imgBBResponse = await fetch(`${process.env.IMGBB_UPLOAD_URL}`, {
      method: "POST",
      body: formData,
    });
    if (!imgBBResponse.ok) {
      throw new Error("Failed to upload image");
    }
    const jsonResponse: { data: { url: string } } = await imgBBResponse.json();
    const imageUrl = jsonResponse.data.url;

    const newBusiness = await prisma.business.create({
      data: {
        name,
        email,
        phone,
        address,
        description,
        image: imageUrl,
        categoryId,
      },
    });
    res.status(201).json({ data: newBusiness });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.put("/businesses/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, description, image, categoryId } =
    req.body;
  try {
    const updatedBusiness = await prisma.business.update({
      where: { id },
      data: { name, email, phone, address, description, image, categoryId },
    });
    res.status(201).json({ data: updatedBusiness });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.delete("/businesses/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.business.delete({ where: { id } });
    res.json({ message: "Business deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.delete("/businesses", async (req, res) => {
  const { businessIds } = req.body;
  try {
    await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
    res.json({ message: "Businesses deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

/* HOURSE CONTROLLER */

app.get("/hours", async (req, res) => {
  try {
    const allHours = await prisma.hours.findMany({
      include: { business: { include: { category: true } } },
    });
    res.json({ data: allHours });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.get("/businesses/:businessId/hours", async (req, res) => {
  const { businessId } = req.params;
  try {
    const hours = await prisma.hours.findMany({
      where: { businessId },
    });
    res.json({ data: hours });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.post("/hours", async (req, res) => {
  const { businessId, day, start, end } = req.body;
  try {
    const newHours = await prisma.hours.create({
      data: {
        day,
        businessId,
        start,
        end,
      },
    });
    res.status(201).json({ data: newHours });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.put("/hours/:id", async (req, res) => {
  const { id } = req.params;
  const { businessId, day, start, end } = req.body;
  try {
    const updatedHours = await prisma.hours.update({
      where: { id },
      data: { day, businessId, start, end },
    });
    res.status(201).json({ data: updatedHours });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.delete("/hours/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.hours.delete({ where: { id } });
    res.json({ message: "Hours entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

/* CATEGORY MODEL */

app.get("/categories", async (req, res) => {
  try {
    const allCategories = await prisma.category.findMany({
      include: { businesses: { include: { hours: true } } },
    });
    res.json({ data: allCategories });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.get("/categories/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { businesses: { include: { hours: true } } },
    });
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ data: category });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.post("/categories", async (req, res) => {
  const { name } = req.body;
  try {
    const newCategory = await prisma.category.create({
      data: {
        name,
      },
    });
    res.status(201).json({ data: newCategory });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.put("/categories/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { name },
    });
    res.status(201).json({ data: updatedCategory });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.delete("/categories/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.category.delete({ where: { id } });
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

/* DISH CONTROLLER */

app.get("/dishes", async (req, res) => {
  try {
    const allDishes = await prisma.dish.findMany({
      include: { business: { include: { category: true } } },
    });
    res.json({ data: allDishes });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.get("/businesses/:businessId/dishes", async (req, res) => {
  const { businessId } = req.params;
  try {
    const dishes = await prisma.dish.findMany({
      where: { businessId },
    });
    res.json({ data: dishes });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.post("/dishes", async (req, res) => {
  const { businessId, name, description, type, price, image } = req.body;
  try {
    const newDish = await prisma.dish.create({
      data: {
        businessId,
        name,
        description,
        type,
        price,
        image,
      },
    });
    res.status(201).json({ data: newDish });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.delete("/dishes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.dish.delete({ where: { id } });
    res.json({ message: "dish entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

/* ATTRIBUTE CONTROLLER */

app.get("/attributes", async (req, res) => {
  try {
    const allAttributes = await prisma.attribute.findMany({
      include: { business: { include: { category: true } } },
    });
    res.json({ data: allAttributes });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.get("/businesses/:businessId/attributes", async (req, res) => {
  const { businessId } = req.params;
  try {
    const attributes = await prisma.attribute.findMany({
      where: { businessId },
    });
    res.json({ data: attributes });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.post("/attributes", async (req, res) => {
  const { businessId, name, value } = req.body;
  try {
    const newAttribute = await prisma.attribute.create({
      data: {
        businessId,
        name,
        value,
      },
    });
    res.status(201).json({ data: newAttribute });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.delete("/attributes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.attribute.delete({ where: { id } });
    res.json({ message: "attribute entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

/* COLLECTION CONTROLLER */

app.get("/collections", async (req, res) => {
  try {
    const allCollections = await prisma.collection.findMany({
      include: {
        collectionBusinesses: {
          include: { business: { include: { category: true } } },
        },
      },
    });
    res.json({ data: allCollections });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.get("/collections/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const collection = await prisma.collection.findMany({
      where: { id },
      include: {
        collectionBusinesses: {
          include: { business: { include: { category: true } } },
        },
      },
    });
    res.json({ data: collection });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.post("/collections", async (req, res) => {
  const { name, businessIds }: { name: string; businessIds: string[] } =
    req.body;
  try {
    if (!Array.isArray(businessIds)) {
      return res.status(400).json({ error: "businessIds must be an array" });
    }
    const newCollection = await prisma.collection.create({
      data: {
        name,
        collectionBusinesses: {
          createMany: {
            data: businessIds.map((businessId) => ({
              businessId,
            })),
          },
        },
      },
    });
    res.status(201).json({ data: newCollection });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.delete("/collections/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.collection.delete({ where: { id } });
    res.json({ message: "collection entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});
