# BraveBucks Rewrite

A rewrite of the BraveBucks site in JavaScript using Node.js and Express. Data processing is done via a mariadb database.

## Installation

1. Clone the repository
2. Run `npm install` to install dependencies
3. Create a `.env` file in the `/src/config` directory with the following contents:
    - `CLIENT_ID` - The client ID of the EVE SSO application
    - `CLIENT_SECRET` - The client secret of the EVE SSO application
    - `CALLBACK_URL` - The callback URL of the EVE SSO application
    - `STATE` - Random string of numbers and letter (e.g. `4Ta1Ll31e101`) for route caching
    - `AUTHORIZATION_URL` - https://login.eveonline.com/v2/oauth/authorize/?response_type=code&redirect_uri=$$$&client_id=<CLIENT_ID>&scope=esi-wallet.read_character_wallet.v1&state=<STATE>
    - `ALLIANCE_ID` - 99003214
    - `DB_USER` - The username of the mariadb database user
    - `DB_PASSWORD` - The password of the mariadb database user
    - `COOKIE_KEY` - Cookie key for encryption (e.g. any value from `https://randomkeygen.com/` under the `504-bit WPA Key` section should be fine). This is just to make it very hard for cookie stealers to decrypt the cookie which only stores the session so you don't have to re-auth every time.