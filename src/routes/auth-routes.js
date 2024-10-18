import { Router } from "express";
import passport from "passport";

const ROUTER = Router();

ROUTER.get("/oauth2", passport.authenticate('oauth2', {
    scope: ["esi-wallet.read_character_wallet.v1"]
}));

ROUTER.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    })
})

ROUTER.get("/oauth2/callback", passport.authenticate('oauth2'), (req, res) => {
    // res.send(req.user);
    res.redirect("/personal/");
})

export default ROUTER;