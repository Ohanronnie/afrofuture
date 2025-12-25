import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import broadcastRoutes from "./routes/broadcastRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import paymentDashboardRoutes from "./routes/paymentDashboardRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import cors from "cors";
import path from "path";

const app = express();

// Middleware to capture raw body for webhook signature verification
app.use(
  "/payment/webhook",
  express.raw({ type: "application/json" }),
  (req: any, res, next) => {
    console.log(
      `[DEBUG] Paystack webhook received: ${JSON.stringify(req.body)}`
    );
    // Store raw body for signature verification
    req.rawBody = req.body;
    // Parse JSON body
    try {
      req.body = JSON.parse(req.body.toString());
    } catch (e) {
      req.body = {};
    }
    next();
  }
);

// JSON parser for all other routes
app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Ticket Bot API",
      version: "1.0.0",
      description: "WhatsApp Ticket Bot API with broadcast and user management",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token obtained from /admin/login endpoint",
        },
      },
    },
    tags: [
      {
        name: "Users",
        description: "User statistics and management",
      },
      {
        name: "Broadcast",
        description: "Message broadcasting endpoints",
      },
      {
        name: "Payments",
        description: "Payment processing and webhook endpoints",
      },
      {
        name: "Admin",
        description: "Admin-only endpoints for user management",
      },
      {
        name: "Tickets",
        description: "Ticket management endpoints",
      },
      {
        name: "Payments",
        description: "Payment dashboard and statistics endpoints",
      },
      {
        name: "Coupons",
        description: "Coupon and discount management",
      },
      {
        name: "Static Files",
        description: "Access uploaded images and assets",
      },
    ],
  },
  apis: ["./src/routes/*.ts", "./src/server.ts"],
};

/**
 * @swagger
 * /uploads/{path}:
 *   get:
 *     summary: Access uploaded files
 *     description: Retrieve any uploaded file (images, etc) using its path. Example /uploads/admin-messages/filename.jpg
 *     tags: [Static Files]
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Relative path to the file within the uploads folder
 *     responses:
 *       200:
 *         description: The file content
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 */

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Redirect root to API docs
app.get("/", (req, res) => {
  res.redirect("/api-docs");
});

app.use(
  cors({
    // allow all origins
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/broadcast", broadcastRoutes); // POST /broadcast (backward compatibility)
app.use("/broadcasts", broadcastRoutes); // All broadcast routes
app.use("/users", userRoutes);
app.use("/api/payments", paymentRoutes); // Payment webhook and callback routes
app.use("/admin", adminRoutes); // Admin routes (requires authentication)
app.use("/admin/tickets", ticketRoutes); // Ticket management routes (requires authentication)
app.use("/admin/payments", paymentDashboardRoutes); // Payment dashboard routes (requires authentication)
app.use("/admin/dashboard", dashboardRoutes); // Dashboard overview routes (requires authentication) - NEW API
app.use("/admin/reminders", reminderRoutes); // Reminder management routes (requires authentication)
app.use("/admin/coupons", couponRoutes); // Coupon management routes (requires authentication)

export const startServer = (port: number = 3000) => {
  console.log(`[DEBUG] Starting Express server on port ${port}...`);
  try {
    const server = app.listen(port, () => {
      console.log(`[DEBUG] Express server listening on port ${port}`);
      console.log(`🚀 Server running on port ${port}`);
      console.log(
        `[DEBUG] API docs available at http://localhost:${port}/api-docs`
      );
    });

    server.on("error", (error: Error) => {
      console.error(`[DEBUG] Express server error:`, error);
    });
  } catch (error) {
    console.error(`[DEBUG] Failed to start server:`, error);
    throw error;
  }
};
