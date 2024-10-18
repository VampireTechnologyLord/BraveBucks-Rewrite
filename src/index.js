import express from "express";
import authRoutes from "./routes/auth-routes.js";
import personalRoutes from "./routes/personal-routes.js";
import managementRoutes from "./routes/management-routes.js";
import passportConfig from "./config/passport-config.js";
import dotenv from "dotenv";
import cookieSession from "cookie-session";
import { setupDatabase } from "./mariadbController.js";
import passport from "passport";
import dataHandler from "./api/dataHandler.js"
import { doAdmPayouts, doKillmailPayouts } from "./payoutCalculator.js";

dotenv.config({path: "./src/config/.env"});
passportConfig;
dataHandler;

const APP = express();
const PORT = 3000;

APP.use(cookieSession({
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    keys: [process.env.COOKIE_KEY]
}));

APP.use(passport.initialize());
APP.use(passport.session());

// Workaround to get latest version to work to avoid both deprecation warnings and vulnerabilities
APP.use(function(request, response, next) {
    if (request.session && !request.session.regenerate) {
        request.session.regenerate = (cb) => {
            cb()
        }
    }
    if (request.session && !request.session.save) {
        request.session.save = (cb) => {
            cb()
        }
    }
    next()
})

APP.set("view engine", "ejs");

APP.use("/auth", authRoutes);
APP.use("/personal", personalRoutes);
APP.use("/management", managementRoutes);

APP.listen(PORT, () => {
    console.info(`Server is running on port ${PORT}`);
    setupDatabase();
});

APP.get("/", (req, res) => {
    res.render("home", {user: req.user});
});

APP.get("/personal", (req, res) => {
    res.render("personal", {user: req.user});
});

APP.get("/management", (req, res) => {
    res.render("management/management", {user: req.user});
});

APP.get("/management/requests", (req, res) => {
    res.render("management/requests", {user: req.user});
});

setTimeout(() => {
    doKillmailPayouts();
    doAdmPayouts()
}, 24 * 60 * 60 * 1000);
