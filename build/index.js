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
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = 3000;
app.get("/", (req, res) => {
    res.send({ message: "Hello World!" });
});
app.listen(port, () => {
    console.log(`Running... http://localhost:${port}`);
});
const prisma = new client_1.PrismaClient();
app.use(express_1.default.json());
/* USER CONTROLLER */
app.get("/users", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allUsers = yield prisma.user.findMany();
        res.json({ data: allUsers });
    }
    catch (error) {
        res.status(500).json({ error: "Error fetching users" });
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
    try {
        const updatedUser = yield prisma.user.update({
            where: { id },
            data: { name, email, phone, password, role },
        });
        res.status(201).json({ data: updatedUser });
    }
    catch (error) {
        res.status(500).json({ error: "Error updating user" });
    }
}));
app.delete("/users/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.user.delete({ where: { id } });
        res.json({ message: "User deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Error deleting user" });
    }
}));
/* BUSINESS CONTROLLER */
app.get("/businesses", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allBusinesses = yield prisma.business.findMany();
        res.json({ data: allBusinesses });
    }
    catch (error) {
        res.status(500).json({ error: "Error fetching businesses" });
    }
}));
app.get("/businesses/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const business = yield prisma.business.findUnique({ where: { id } });
        if (!business) {
            // return res.status(404).json({ error: "Business not found" });
        }
        res.json({ data: business });
    }
    catch (error) {
        res.status(500).json({ error: "Error fetching business" });
    }
}));
app.post("/businesses", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, phone, address, description, image, categoryId } = req.body;
    try {
        const newBusiness = yield prisma.business.create({
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
    }
    catch (error) {
        res.status(500).json({ error: "Error creating business" });
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
        res.status(500).json({ error: "Error updating business" });
    }
}));
app.delete("/businesses/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.business.delete({ where: { id } });
        res.json({ message: "Business deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Error deleting business" });
    }
}));
/* HOURSE CONTROLLER */
app.get("/hours", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allHours = yield prisma.hours.findMany();
        res.json({ data: allHours });
    }
    catch (error) {
        res.status(500).json({ error: "Error fetching hours" });
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
        res.status(500).json({ error: "Error fetching hours for business" });
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
        res.status(500).json({ error: "Error creating hours" });
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
        res.status(500).json({ error: "Error updating hours" });
    }
}));
app.delete("/hours/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.hours.delete({ where: { id } });
        res.json({ message: "Hours entry deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Error deleting hours entry" });
    }
}));
/* CATEGORY MODEL */
app.get("/categories", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allCategories = yield prisma.category.findMany();
        res.json({ data: allCategories });
    }
    catch (error) {
        res.status(500).json({ error: "Error fetching categories" });
    }
}));
app.get("/categories/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const category = yield prisma.category.findUnique({ where: { id } });
        if (!category) {
            // return res.status(404).json({ error: "Category not found" });
        }
        res.json({ data: category });
    }
    catch (error) {
        res.status(500).json({ error: "Error fetching category" });
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
        res.status(500).json({ error: "Error creating category" });
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
        res.status(500).json({ error: "Error updating category" });
    }
}));
app.delete("/categories/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.category.delete({ where: { id } });
        res.json({ message: "Category deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ error: "Error deleting category" });
    }
}));
