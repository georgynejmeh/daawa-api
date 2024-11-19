import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import express from "express";
const app = express();
const port = 3000;

app.get("/", (req, res) => {
  res.send({ message: "Hello World!" });
});

app.listen(port, () => {
  console.log(`Running... http://localhost:${port}`);
});

const prisma = new PrismaClient();
app.use(express.json());

/* USER CONTROLLER */

app.get("/users", async (req, res) => {
  try {
    const allUsers = await prisma.user.findMany();
    res.json({ data: allUsers });
  } catch (error) {
    res.status(500).json({ error: "Error fetching users" });
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
  try {
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { name, email, phone, password, role },
    });
    res.status(201).json({ data: updatedUser });
  } catch (error) {
    res.status(500).json({ error: "Error updating user" });
  }
});

app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting user" });
  }
});

/* BUSINESS CONTROLLER */

app.get("/businesses", async (req, res) => {
  try {
    const allBusinesses = await prisma.business.findMany({
      include: { category: true, hours: true },
    });
    res.json({ data: allBusinesses });
  } catch (error) {
    res.status(500).json({ error: "Error fetching businesses" });
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
      // return res.status(404).json({ error: "Business not found" });
    }
    res.json({ data: business });
  } catch (error) {
    res.status(500).json({ error: "Error fetching business" });
  }
});

app.post("/businesses", async (req, res) => {
  const { name, email, phone, address, description, image, categoryId } =
    req.body;
  try {
    const newBusiness = await prisma.business.create({
      data: {
        name,
        email,
        phone,
        address,
        description,
        image,
        categoryId,
      },
    });
    res.status(201).json({ data: newBusiness });
  } catch (error) {
    res.status(500).json({ error: "Error creating business" });
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
    res.status(500).json({ error: "Error updating business" });
  }
});

app.delete("/businesses/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.business.delete({ where: { id } });
    res.json({ message: "Business deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting business" });
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
    res.status(500).json({ error: "Error fetching hours" });
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
    res.status(500).json({ error: "Error fetching hours for business" });
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
    res.status(500).json({ error: "Error creating hours" });
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
    res.status(500).json({ error: "Error updating hours" });
  }
});

app.delete("/hours/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.hours.delete({ where: { id } });
    res.json({ message: "Hours entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting hours entry" });
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
    res.status(500).json({ error: "Error fetching categories" });
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
      // return res.status(404).json({ error: "Category not found" });
    }
    res.json({ data: category });
  } catch (error) {
    res.status(500).json({ error: "Error fetching category" });
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
    res.status(500).json({ error: "Error creating category" });
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
    res.status(500).json({ error: "Error updating category" });
  }
});

app.delete("/categories/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.category.delete({ where: { id } });
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting category" });
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
    res.status(500).json({ error: "Error fetching dishes" });
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
    res.status(500).json({ error: "Error fetching dishes for business" });
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
    res.status(500).json({ error: "Error creating dish" });
  }
});

app.delete("/dishes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.dish.delete({ where: { id } });
    res.json({ message: "dish entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting dishes entry" });
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
    res.status(500).json({ error: "Error fetching dishes" });
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
    res.status(500).json({ error: "Error fetching attributes for business" });
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
    res.status(500).json({ error: "Error creating attribute" });
  }
});

app.delete("/attributes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.attribute.delete({ where: { id } });
    res.json({ message: "attribute entry deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting attributes entry" });
  }
});
