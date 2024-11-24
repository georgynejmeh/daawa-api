"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = 3000;
const cors_1 = __importDefault(require("cors"));
app.use((0, cors_1.default)());
// var storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "public/uploads/");
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + path.extname(file.originalname)); //Appending extension
//   },
// });
var storage = multer_1.default.memoryStorage();
var upload = (0, multer_1.default)({ storage: storage });
app.get("/", (req, res) => {
    res.send({ message: "Hello World!" });
});
app.listen(port, () => {
    console.log(`Running... http://localhost:${port}`);
});
const prisma = new client_1.PrismaClient();
app.use(express_1.default.json());
app.use(express_1.default.static("public"));
/* TESTS */
app.post("/test/imgbb", upload.single("image"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const image = req.file;
        if (!image) {
            return res.status(400).json({ error: "no image" });
        }
        const formData = new FormData();
        // const imageBlob = new Blob([image.buffer], { type: image.mimetype });
        const imageBuffer = fs_1.default.readFileSync(image.path);
        const imageBlob = new Blob([imageBuffer], { type: image.mimetype });
        formData.append("key", process.env.IMGBB_API_KEY);
        formData.append("image", imageBlob, image.filename);
        const response = yield fetch(process.env.IMGBB_UPLOAD_URL, {
            method: "POST",
            body: formData,
        });
        if (!response) {
            return res.status(400).json({ error: "no response from ibb" });
        }
        if (response.ok) {
            return res.status(201).json({ data: yield response.json() });
        }
        const errorData = yield response.json(); // Capture the error message from the response
        return res.status(400).json({
            error: `ImgBB API error: ${errorData.error ? errorData.error.message : "Unknown error"} CODE ${response.status}`,
        });
        // return res.status(500).json({
        //   error: `imageblob: ${imageBlob} CODE ${response.status} ERROR `,
        // });
    }
    catch (error) {
        return res.status(500).json({ error: error });
    }
}));
/* USER CONTROLLER */
app.get("/users", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;
    try {
        const allUsers = yield prisma.user.findMany({
            skip: pageSize * (page - 1),
            take: pageSize * page,
        });
        const totalUsers = yield prisma.user.count();
        res.json({ total: totalUsers, pageSize: pageSize, data: allUsers });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.post("/users", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, phone, password, role } = req.body;
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    try {
        const newUser = yield prisma.user.create({
            data: {
                name,
                email,
                phone,
                password: hashedPassword,
                role,
            },
        });
        res.status(201).json({ data: newUser });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.put("/users/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, email, phone, password, role } = req.body;
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    try {
        const updatedUser = yield prisma.user.update({
            where: { id },
            data: { name, email, phone, password: hashedPassword, role },
        });
        res.status(201).json({ data: updatedUser });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.patch("/users/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, email, phone, password, role } = req.body;
    const data = {};
    if (name)
        data.name = name;
    if (email)
        data.email = email;
    if (phone)
        data.phone = phone;
    if (role)
        data.role = role;
    if (password) {
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        data.password = hashedPassword;
    }
    try {
        const updatedUser = yield prisma.user.update({
            where: { id: id },
            data,
        });
        res.status(200).json({ data: updatedUser });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.delete("/users/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.user.delete({ where: { id } });
        res.json({ message: "User deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.delete("/users", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userIds } = req.body;
    try {
        yield prisma.user.deleteMany({ where: { id: { in: userIds } } });
        res.json({ message: "Users deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
/* BUSINESS CONTROLLER */
app.get("/businesses", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;
    try {
        const allBusinesses = yield prisma.business.findMany({
            skip: pageSize * (page - 1),
            take: pageSize * page,
            include: { category: true, hours: true },
        });
        const totalBusinesses = yield prisma.business.count();
        res.json({
            total: totalBusinesses,
            pageSize: pageSize,
            data: allBusinesses,
        });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.get("/businesses/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const business = yield prisma.business.findUnique({
            where: { id },
            include: { category: true, hours: true, dishes: true, attributes: true },
        });
        if (!business) {
            return res.status(404).json({ error: "Business not found" });
        }
        res.json({ data: business });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.post("/businesses", upload.single("image"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, phone, address, description, categoryId } = req.body;
        const image = req.file;
        if (!image) {
            return res.status(400).json({ error: "No image file uploaded" });
        }
        const formData = new FormData();
        const imageBlob = new Blob([image.buffer], { type: image.mimetype });
        formData.append("key", process.env.IMGBB_API_KEY);
        formData.append("image", imageBlob, `${Date.now()}`);
        const imgBBResponse = yield fetch(`${process.env.IMGBB_UPLOAD_URL}`, {
            method: "POST",
            body: formData,
        });
        if (!imgBBResponse.ok) {
            throw new Error("Failed to upload image");
        }
        const jsonResponse = yield imgBBResponse.json();
        const imageUrl = jsonResponse.data.url;
        const newBusiness = yield prisma.business.create({
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
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.put("/businesses/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, email, phone, address, description, image, categoryId } = req.body;
    try {
        const updatedBusiness = yield prisma.business.update({
            where: { id },
            data: { name, email, phone, address, description, image, categoryId },
        });
        res.status(201).json({ data: updatedBusiness });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.delete("/businesses/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.business.delete({ where: { id } });
        res.json({ message: "Business deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.delete("/businesses", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { businessIds } = req.body;
    try {
        yield prisma.business.deleteMany({ where: { id: { in: businessIds } } });
        res.json({ message: "Businesses deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
/* HOURSE CONTROLLER */
app.get("/hours", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allHours = yield prisma.hours.findMany({
            include: { business: { include: { category: true } } },
        });
        res.json({ data: allHours });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.get("/businesses/:businessId/hours", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { businessId } = req.params;
    try {
        const hours = yield prisma.hours.findMany({
            where: { businessId },
        });
        res.json({ data: hours });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.post("/hours", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { businessId, day, start, end } = req.body;
    try {
        const newHours = yield prisma.hours.create({
            data: {
                day,
                businessId,
                start,
                end,
            },
        });
        res.status(201).json({ data: newHours });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.put("/hours/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { businessId, day, start, end } = req.body;
    try {
        const updatedHours = yield prisma.hours.update({
            where: { id },
            data: { day, businessId, start, end },
        });
        res.status(201).json({ data: updatedHours });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.delete("/hours/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.hours.delete({ where: { id } });
        res.json({ message: "Hours entry deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
/* CATEGORY MODEL */
app.get("/categories", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allCategories = yield prisma.category.findMany({
            include: { businesses: { include: { hours: true } } },
        });
        res.json({ data: allCategories });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.get("/categories/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const category = yield prisma.category.findUnique({
            where: { id },
            include: { businesses: { include: { hours: true } } },
        });
        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }
        res.json({ data: category });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.post("/categories", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name } = req.body;
    try {
        const newCategory = yield prisma.category.create({
            data: {
                name,
            },
        });
        res.status(201).json({ data: newCategory });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.put("/categories/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name } = req.body;
    try {
        const updatedCategory = yield prisma.category.update({
            where: { id },
            data: { name },
        });
        res.status(201).json({ data: updatedCategory });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.delete("/categories/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.category.delete({ where: { id } });
        res.json({ message: "Category deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
/* DISH CONTROLLER */
app.get("/dishes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allDishes = yield prisma.dish.findMany({
            include: { business: { include: { category: true } } },
        });
        res.json({ data: allDishes });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.get("/businesses/:businessId/dishes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { businessId } = req.params;
    try {
        const dishes = yield prisma.dish.findMany({
            where: { businessId },
        });
        res.json({ data: dishes });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.post("/dishes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { businessId, name, description, type, price, image } = req.body;
    try {
        const newDish = yield prisma.dish.create({
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
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.delete("/dishes/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.dish.delete({ where: { id } });
        res.json({ message: "dish entry deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
/* ATTRIBUTE CONTROLLER */
app.get("/attributes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allAttributes = yield prisma.attribute.findMany({
            include: { business: { include: { category: true } } },
        });
        res.json({ data: allAttributes });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.get("/businesses/:businessId/attributes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { businessId } = req.params;
    try {
        const attributes = yield prisma.attribute.findMany({
            where: { businessId },
        });
        res.json({ data: attributes });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.post("/attributes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { businessId, name, value } = req.body;
    try {
        const newAttribute = yield prisma.attribute.create({
            data: {
                businessId,
                name,
                value,
            },
        });
        res.status(201).json({ data: newAttribute });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.delete("/attributes/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.attribute.delete({ where: { id } });
        res.json({ message: "attribute entry deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
/* COLLECTION CONTROLLER */
app.get("/collections", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allCollections = yield prisma.collection.findMany({
            include: {
                collectionBusinesses: {
                    include: { business: { include: { category: true } } },
                },
            },
        });
        res.json({ data: allCollections });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.get("/collections/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const collection = yield prisma.collection.findMany({
            where: { id },
            include: {
                collectionBusinesses: {
                    include: { business: { include: { category: true } } },
                },
            },
        });
        res.json({ data: collection });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.post("/collections", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, businessIds } = req.body;
    try {
        if (!Array.isArray(businessIds)) {
            return res.status(400).json({ error: "businessIds must be an array" });
        }
        const newCollection = yield prisma.collection.create({
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
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
app.delete("/collections/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.collection.delete({ where: { id } });
        res.json({ message: "collection entry deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
}));
