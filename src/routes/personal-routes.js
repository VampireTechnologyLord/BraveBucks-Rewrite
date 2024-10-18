import { Router } from "express";
import { createPayoutRequest, getKillmailsByUserId, getPayoutsByUserId, getSettingsByPath } from "../mariadbController.js";
const ROUTER = Router();

function authCheck(req, res, next) {
    if (!req.user) {
        res.redirect("/auth/oauth2");
    } else {
        next();
    }
}

ROUTER.get("/", authCheck, async (req, res) => {
    res.render("personal", { user: req.user, amountRequired: await getSettingsByPath("amountRequired").then((data) => {return data[0].value}), killmails: await getKillmailsByUserId(req.user.user_id), payouts: await getPayoutsByUserId(req.user.user_id)});
})

ROUTER.get("/payout", authCheck, async (req, res) => {
    res.redirect("/personal")
    createPayoutRequest(req.user.user_id)
})

export default ROUTER;