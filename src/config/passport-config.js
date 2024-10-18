import passport from "passport";
import OAuth2Strategy from "passport-oauth2";
import dotenv from "dotenv";
import { addUser, getUserById } from "../mariadbController.js";
dotenv.config({ path: "./src/config/.env" });

passport.serializeUser((user, done) => {
    done(null, user.id);
});

function makeURLCompliant(url) {
    return url
        .replace(/:/g, "%3A")
        .replace(/\//g, "%2F")
        .replace(/\?/g, "%3F")
        .replace(/=/g, "%3D")
        .replace(/&/g, "%26");
}


passport.serializeUser((user, done) => {
    done(null, user.user_id)
})

passport.deserializeUser((id, done) => {
    getUserById(id).then((user) => {
        done(null, user[0]);
    })
})

passport.use(
    new OAuth2Strategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: process.env.CALLBACK_URL,
            authorizationURL: process.env.AUTHORIZATION_URL.replace(
                "$$$",
                makeURLCompliant(process.env.CALLBACK_URL)
            ),
            tokenURL: process.env.TOKEN_URL,
        },
        async function (accessToken, refreshToken, profile, done) {
            await fetch(process.env.VERIFY_URL, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })
                .then((response) => response.json())
                .then(async (data) => {
                    await fetch(
                        `https://esi.evetech.net/latest/characters/${data.CharacterID}/`
                    )
                        .then((charResponse) => charResponse.json())
                        .then(async (charData) => {
                            if (
                                charData.alliance_id == process.env.ALLIANCE_ID
                            ) {
                                getUserById(data.CharacterID).then((user) => {
                                    if (user.length == 1) {
                                        done(null, user[0]);
                                    } else {
                                        addUser(charData.name, data.CharacterID, "user", refreshToken).then((user) => {
                                            done(null, user[0]);
                                        });
                                    }
                                })
                            } else {
                                console.warn(
                                    `User ${charData.name} is not in the correct alliance`
                                );
                                done("User not in alliance", null);
                            }
                        });
                });
        }
    )
);

const calling = 0;

export default calling;
