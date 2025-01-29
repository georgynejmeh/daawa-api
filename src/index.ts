import { PrismaClient, User } from "@prisma/client";
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

import jwt from "jsonwebtoken";

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

app.post("/register", async (req, res) => {
  if (!JWT_SECRET_KEY) {
    return res.status(500).json({ message: "JWT Auth Error" });
  }

  const { name, email, phone, password, role } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Missing name" });
  } else if (!email) {
    return res.status(400).json({ message: "Missing name" });
  } else if (!phone || !password || !role) {
    return res.status(400).json({ message: "Missing phone, password or role" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(400).json({ message: "Email already in use" });
  }

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashedPassword,
      role,
    },
  });

  // Create a JWT token
  const token = jwt.sign({ userId: newUser.id }, JWT_SECRET_KEY, {
    expiresIn: "30d",
  });

  res.status(201).json({
    message: "User registered successfully",
    token,
  });
});

app.post("/login", async (req, res) => {
  if (!JWT_SECRET_KEY) {
    return res.status(500).json({ message: "JWT Auth Error" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing email or password" });
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid email" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid password" });
  }

  // Create a JWT token
  const token = jwt.sign({ userId: user.id }, JWT_SECRET_KEY, {
    expiresIn: "30d",
  });

  res.json({
    message: "Login successful",
    token,
  });
});

// JWT authentication middleware
const authenticateToken = (req: any, res: any, next: any) => {
  if (!JWT_SECRET_KEY) {
    return res.status(500).json({ message: "JWT Auth Error" });
  }

  const token =
    req.headers["authorization"] && req.headers["authorization"].split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  jwt.verify(token, JWT_SECRET_KEY, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user as User;
    next();
  });
};

// // Apply authentication middleware to a specific protected route
// app.get("/protected", authenticateToken, (req, res) => {

// Apply authentication middleware globally
app.use(authenticateToken);

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
        errorData.error ? errorData.error : "Unknown error"
      } CODE ${response.status}`,
    });
    // return res.status(500).json({
    //   error: `imageblob: ${imageBlob} CODE ${response.status} ERROR `,
    // });
  } catch (error) {
    return res.status(500).json({ error: error });
  }
});

const pageSize = 10;

app.get("/statistics", async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    const businessCount = await prisma.business.count();
    const categoryCount = await prisma.category.count();
    const collectionCount = await prisma.collection.count();
    const dishCount = await prisma.dish.count();
    const hoursCount = await prisma.hours.count();

    const statistics = {
      count: {
        users: userCount,
        businesses: businessCount,
        categories: categoryCount,
        collections: collectionCount,
        dishes: dishCount,
        hours: hoursCount,
      },
    };

    res.json({
      data: statistics,
    });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

/* USER CONTROLLER */

app.get("/users", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  try {
    const allUsers = await prisma.user.findMany({
      skip: pageSize * (page - 1),
      take: pageSize,
      orderBy: {
        id: "desc",
      },
    });
    const totalUsers = await prisma.user.count();
    res.json({
      total: totalUsers,
      page: page,
      totalPages: Math.ceil(totalUsers / pageSize),
      pageSize: pageSize,
      data: allUsers,
    });
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

app.patch("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, password, role } = req.body;

  const data: { [key: string]: any } = {};

  if (name) data.name = name;
  if (email) data.email = email;
  if (phone) data.phone = phone;
  if (role) data.role = role;

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    data.password = hashedPassword;
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: id },
      data,
    });

    res.status(200).json({ data: updatedUser });
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
  try {
    const allBusinesses = await prisma.business.findMany({
      skip: pageSize * (page - 1),
      take: pageSize,
      orderBy: {
        id: "desc",
      },
      include: { category: true, hours: true },
    });
    const totalBusinesses = await prisma.business.count();
    res.json({
      total: totalBusinesses,
      page: page,
      totalPages: Math.ceil(totalBusinesses / pageSize),
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
    formData.append("image", imageBlob);
    formData.append("name", `${Date.now()}`);

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

app.patch("/businesses/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, description, categoryId } = req.body;
    const image = req.file;

    const updateData: any = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (description) updateData.description = description;
    if (categoryId) updateData.categoryId = categoryId;

    if (image) {
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

      const jsonResponse: { data: { url: string } } =
        await imgBBResponse.json();
      const imageUrl = jsonResponse.data.url;
      updateData.image = imageUrl;
    }

    const existingBusiness = await prisma.business.findUnique({
      where: { id: id },
    });

    if (!existingBusiness) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Perform the update
    const updatedBusiness = await prisma.business.update({
      where: { id: id },
      data: updateData,
    });

    res.status(200).json({ data: updatedBusiness });
  } catch (error) {
    res.status(500).json({ error: error || "Internal server error" });
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
      orderBy: {
        id: "desc",
      },
    });
    const totalCategories = await prisma.category.count();
    res.json({ total: totalCategories, data: allCategories });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.get("/categories/businesses", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  try {
    const allCategories = await prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        businesses: {
          skip: pageSize * (page - 1),
          take: pageSize,
          orderBy: {
            id: "desc",
          },
        },
      },
    });
    const totalCategories = await prisma.category.count();
    res.json({ total: totalCategories, data: allCategories });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.get("/categories/:id", async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = 10;
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        businesses: {
          skip: pageSize * (page - 1),
          take: pageSize,
          orderBy: {
            id: "desc",
          },
          include: { hours: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }
    const totalBusinessesInCategory = await prisma.business.count({
      where: { categoryId: id },
    });
    res.json({
      totalBusinessesInCategory: totalBusinessesInCategory,
      page: page,
      totalPages: Math.ceil(totalBusinessesInCategory / pageSize),
      pageSize: pageSize,
      data: category,
    });
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

app.post("/dishes", upload.single("image"), async (req, res) => {
  const { businessId, name, description, type, price } = req.body;
  const image = req.file;

  if (!image) {
    return res.status(400).json({ error: "No image file uploaded" });
  }

  const formData = new FormData();
  const imageBlob = new Blob([image.buffer], { type: image.mimetype });
  formData.append("key", process.env.IMGBB_API_KEY!);
  formData.append("image", imageBlob);
  formData.append("name", `${Date.now()}`);

  const imgBBResponse = await fetch(`${process.env.IMGBB_UPLOAD_URL}`, {
    method: "POST",
    body: formData,
  });
  if (!imgBBResponse.ok) {
    throw new Error("Failed to upload image");
  }
  const jsonResponse: { data: { url: string } } = await imgBBResponse.json();
  const imageUrl = jsonResponse.data.url;
  try {
    const newDish = await prisma.dish.create({
      data: {
        businessId,
        name,
        description,
        type,
        price: Number(price),
        image: imageUrl,
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
      orderBy: {
        id: "desc",
      },
    });
    const totalCollections = await prisma.collection.count();
    res.json({ total: totalCollections, data: allCollections });
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

/* ORDER CONTROLLER */

app.post("/orders", async (req, res) => {
  const { orderItems, startDate, endDate, quantity } = req.body;
  const status = "PENDING";
  try {
    // if orderItems.dishes
    // else []
    const newOrder = await prisma.order.create({
      data: {
        startDate,
        endDate,
        quantity,
        status,
        orderItems: {
          create: orderItems.map(
            (item: {
              businessId: number;
              price: number;
              dishIds: string[];
            }) => ({
              businessId: item.businessId,
              price: item.price,
              dishIds: item.dishIds || [],
            })
          ),
        },
      },
      include: {
        orderItems: true,
      },
    });
    res.status(201).json({ data: newOrder });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json({ data: orders });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.get("/orders/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
      },
    });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ data: order });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

app.patch("/orders/:id", async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate, status, quantity, orderItems } = req.body;

  try {
    const updateData: any = {};

    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (status) updateData.status = status;
    if (quantity !== undefined) updateData.quantity = quantity;

    if (orderItems) {
      for (const orderItem of orderItems) {
        const { businessId, price } = orderItem;

        const existingOrderItem = await prisma.order_Item.findFirst({
          where: {
            orderId: id,
            businessId: businessId,
          },
        });

        if (existingOrderItem) {
          await prisma.order_Item.update({
            where: { id: existingOrderItem.id },
            data: {
              price: price,
            },
          });
        } else {
          await prisma.order_Item.create({
            data: {
              orderId: id,
              businessId: businessId,
              price: price,
            },
          });
        }
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        orderItems: true,
      },
    });

    res.json({ data: updatedOrder });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error });
  }
});

app.delete("/orders/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.order.delete({
      where: { id },
    });
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});
