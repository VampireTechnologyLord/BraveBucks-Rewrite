import mariadb from 'mariadb';
import dotenv from 'dotenv';

dotenv.config({path: "./src/config/.env"});

/**
 * Setup the database with the necessary tables
 */
async function setupDatabase() {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("CREATE DATABASE IF NOT EXISTS bravebucks").then(console.info("Database found or created"));
        await conn.query("USE bravebucks").then(console.info("Using bravebucks database"));
        await conn.query("CREATE TABLE IF NOT EXISTS payouts (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, amount DECIMAL(13, 2) NOT NULL, date DATETIME NOT NULL DEFAULT NOW(), status ENUM('denied', 'pending', 'paid') NOT NULL DEFAULT 'pending')").then(console.info("Table payouts found or created"));
        await conn.query("CREATE TABLE IF NOT EXISTS users (username VARCHAR(255) NOT NULL, user_id INT PRIMARY KEY NOT NULL, role ENUM('user', 'manager', 'admin') NOT NULL DEFAULT 'user', amount DECIMAL(13, 2) NOT NULL DEFAULT 0, refresh_token MEDIUMTEXT NOT NULL)").then(console.info("Table users found or created"));
        await conn.query("CREATE TABLE IF NOT EXISTS killmail_data (killmail_id INT PRIMARY KEY NOT NULL, victim_name VARCHAR(255) NOT NULL, victim_alliance VARCHAR(255), victim_corporation VARCHAR(255) NOT NULL, ship_type INT NOT NULL, points INT NOT NULL, date DATETIME NOT NULL DEFAULT NOW(), defensive BOOLEAN NOT NULL DEFAULT true, accounted BOOLEAN NOT NULL DEFAULT false)").then(console.info("Table killmail_data found or created"));
        await conn.query("CREATE TABLE IF NOT EXISTS killmail_users (killmail_id INT PRIMARY KEY NOT NULL, user_id INT NOT NULL)").then(console.info("Table killmail_users found or created"));
        await conn.query("CREATE TABLE IF NOT EXISTS adm (combined_id VARCHAR(255) PRIMARY KEY NOT NULL, system_id INT PRIMARY KEY NOT NULL, system_name VARCHAR(256) NOT NULL, adm_level FLOAT NOT NULL, last_updated DATETIME NOT NULL DEFAULT NOW())").then(console.info("Table adm found or created"));
        await conn.query("CREATE TABLE IF NOT EXISTS adm_users (user_id INT PRIMARY KEY NOT NULL, last_updated DATETIME DEFAULT NOW())").then(console.info("Table adm_users found or created"));
        await conn.query("CREATE TABLE IF NOT EXISTS settings (value INT NOT NULL, path TINYTEXT NOT NULL, date DATETIME NOT NULL DEFAULT NOW())").then(console.info("Table settings found or created"));
    }
    catch (err) {
        console.error(err);
    }
    finally {
        console.info("Closing connection");
        if (conn) conn.end();
        
    }
}

const pool = mariadb.createPool({
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
})


/**
 * Add a payout request to the database
 * @param {number} user_id The user_id of the user requesting the payout
 * @param {number} amount The amount of ISK to be paid out
 */
async function addPayoutRequest(user_id, amount) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("INSERT INTO payouts (user_id, amount) VALUES (?, ?)", [user_id, amount]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Register a killmail to the killmail_data table
 * @param {number} killmail_id The killmail_id of the killmail
 * @param {string} victim_name The name of the victim
 * @param {string | null} victim_alliance The alliance of the victim
 * @param {string} victim_corporation The corporation of the victim
 * @param {number} ship_type The ship type of the victim
 * @param {number} points The points of the killmail
 * @param {boolean} defensive If the killmail was defensive
 */
async function registerKillmailData(killmail_id, victim_name, victim_alliance, victim_corporation, ship_type, points, defensive) {
    let conn;
    let defensiveInt = defensive ? 1 : 0;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("INSERT INTO killmail_data (killmail_id, victim_name, victim_alliance, victim_corporation, ship_type, points, defensive) VALUES (?, ?, ?, ?, ?, ?, ?)", [killmail_id, victim_name, victim_alliance, victim_corporation, ship_type, points, defensiveInt]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Link a user to a killmail in the killmail_users table
 * @param {number} killmail_id The killmail_id of the killmail
 * @param {number} user_id The user_id of the user
 */
async function registerKillmailUser(killmail_id, user_id) {
    const combined_id = `${killmail_id}_${user_id}`;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("SELECT * FROM killmail_data WHERE killmail_id = ?", [killmail_id]).then(async killmail => {
            if (killmail.length > 0) {
                await conn.query("INSERT INTO killmail_users (combined_id, killmail_id, user_id) VALUES (?, ?, ?)", [combined_id, killmail_id, user_id]);
            } else {
                console.error(`Registering killmail participants failed: killmail ${killmail_id} not found`);
            }
        })
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Add a killmail to the database
 * @param {number} killmail_id The killmail_id of the killmail
 * @param {number[]} participant_ids The user_ids of the participants
 * @param {string} victim_name The name of the victim
 * @param {string | null} victim_alliance The alliance of the victim
 * @param {string} victim_corporation The corporation of the victim
 * @param {number} ship_type The ship type of the victim
 * @param {number} points The points of the killmail
 * @param {boolean} defensive Whether the killmail was defensive
 */
async function addKillmail(killmail_id, participant_ids, victim_name, victim_alliance, victim_corporation, ship_type, points, defensive=true) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await registerKillmailData(killmail_id, victim_name, victim_alliance, victim_corporation, ship_type, points, defensive).then(async () => {
            participant_ids.forEach(async (participant_id) => {
                await registerKillmailUser(killmail_id, participant_id);
            })
        })
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Add a user to the users table
 * @param {string} username The username of the user
 * @param {number} user_id The user_id of the user
 * @param {"user" | "manager" | "admin"} role The role of the user
 * @param {string} refresh_token The refresh token of the user
 */
async function addUser(username, user_id, role, refresh_token) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("INSERT INTO users (username, user_id, role, refresh_token) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE username = ?, user_id = ?, role = ?, refresh_token = ?", [username, user_id, role, refresh_token, username, user_id, role, refresh_token]);
        return await conn.query("SELECT * FROM users WHERE user_id = ?", [user_id]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Get all users from the users table
 * @returns A list of all users in the users table
 */
async function getUsers() {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        return await conn.query("SELECT * FROM users");
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Get all payouts from the payouts table
 * @returns A list of all payouts in the payouts table
 */
async function getPayouts() {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        return await conn.query("SELECT * FROM payouts");
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Update the status of a payout in the payouts table
 * @param {number} id The id of the payout to update
 * @param {"denied" | "pending" | "paid"} status The status to update the payout to
 */
async function updatePayout(id, status) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("UPDATE payouts SET status = ? WHERE id = ?", [status, id]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

async function getKillmailsOnDay(date) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        return await conn.query("SELECT * FROM killmail_data WHERE date = ?", [date]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Get the user with the given user_id
 * @param {number} user_id The user_id of the user to get
 * @returns The user with the given user_id
 */
async function getUserById(user_id) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        return await conn.query("SELECT * FROM users WHERE user_id = ?", [user_id]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Get the user with the given username 
 * @param {string} username The username of the user to get
 * @returns The user with the given username
 */
async function getUserByName(username) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        return await conn.query("SELECT * FROM users WHERE username = ?", [username]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Gets the killmails for the given user_id
 * @param {number} user_id The user_id of the user to get killmails for
 * @param {number} limit The number of killmails to get
 * @returns The killmails for the given user_id
 */
async function getKillmailsByUserId(user_id, limit=10) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        let killmailData = [];
        return await conn.query("SELECT * FROM killmail_users WHERE user_id = ? LIMIT ?", [user_id, limit]).then(async killmails => {
            for (let i = 0; i < killmails.length; i++) {
                await conn.query("SELECT * FROM killmail_data WHERE killmail_id = ?", [killmails[i].killmail_id]).then(async killmail => {
                    killmailData.push(killmail[0]);                    
                })
            }
            return killmailData;
        })
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Gets the payouts for the given user_id
 * @param {number} user_id The user_id of the user to get payouts for
 * @param {number} limit The number of payouts to get
 * @returns The payouts for the given user_id
 */
async function getPayoutsByUserId(user_id, limit=10) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        return await conn.query("SELECT * FROM payouts WHERE user_id = ? ORDER BY date DESC LIMIT ?", [user_id, limit]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Sets the role of the user with the given user_id
 * @param {number} user_id The user_id of the user to update
 * @param {"user" | "manager" | "admin"} role The role to update the user to
 */
async function setUserRole(user_id, role) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("UPDATE users SET role = ? WHERE user_id = ?", [role, user_id]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Sets the killmail with the given killmail_id to accounted or not accounted
 * @param {number} killmail_id The killmail_id of the killmail to set accounted
 * @param {boolean} accounted Set the killmail to accounted or not accounted
 */
async function setKillmailAccounted(killmail_id, accounted = true) {
    let conn;
    let accountedInt = accounted ? 1 : 0;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("UPDATE killmail_data SET accounted = ? WHERE killmail_id = ?", [accountedInt, killmail_id]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

async function createPayoutRequest(user_id) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("SELECT amount FROM users WHERE user_id = ?", [user_id]).then(async userAmount => {
            await conn.query("INSERT INTO payouts (user_id, amount) VALUES (?, ?)", [user_id, userAmount[0].amount]).then(async () => {
                await conn.query("UPDATE users SET amount = 0 WHERE user_id = ?", [user_id]);
            })
        })
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Deletes the user with the given user_id
 * @param {number} user_id The user_id of the user to delete
 */
async function deleteUser(user_id) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("DELETE FROM users WHERE user_id = ?", [user_id]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

async function setAdmData(system_id, system_name, adm_level) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("SELECT * FROM adm WHERE system_id = ?", [system_id]).then(async adm => {
            if (adm.length > 0) {
                await conn.query("UPDATE adm SET adm_level = ?, last_updated = NOW() WHERE system_id = ?", [adm_level, system_id]);
            } else {
                await conn.query("INSERT INTO adm (system_id, system_name, adm_level, last_updated) VALUES (?, ?, ?, NOW())", [system_id, system_name, adm_level]);
            }
        })
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Gets the adm data for the given system_id
 * @param {number} system_id The system_id of the system to get the adm data for
 * @returns {Promise<[{system_id: number, system_name: string, adm_level: number, last_updated}]>} The adm data for the given system_id
 */
async function getAdmData(system_id) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        return await conn.query("SELECT * FROM adm WHERE system_id = ?", [system_id]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}


async function addAdmUser(user_id) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("INSERT INTO adm_users (user_id, last_updated) VALUES (?, NOW())", [user_id]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

async function updateAdmUser(user_id) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("UPDATE adm_users SET last_updated = NOW() WHERE user_id = ?", [user_id]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Gets the amount stored for the user with the given user_id
 * @param {number} user_id The user_id of the user to get the amount stored for
 * @returns Get the amount stored for the user with the given user_id
 */
async function getAdmUser(user_id) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        return await conn.query("SELECT * FROM adm_users WHERE user_id = ?", [user_id]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

async function getAdmUsers() {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        return await conn.query("SELECT * FROM adm_users");
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}


/**
 * Gets the refresh token of the user with the given user_id
 * @param {number} user_id The user_id of the user to get the refresh token for
 * @returns {Promise<any>} The refresh token of the user
 */
async function getRefreshToken(user_id) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        return await conn.query("SELECT refresh_token FROM users WHERE user_id = ?", [user_id]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Updates the refresh token of the user with the given user_id
 * @param {number} user_id The user_id of the user to update
 * @param {string} refresh_token The refresh token to update the user to
 */
async function updateRefreshToken(user_id, refresh_token) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("UPDATE users SET refresh_token = ? WHERE user_id = ?", [refresh_token, user_id]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * Get all killmails that have not been accounted for
 * @returns {Promise<any>} The killmails that have not been accounted for
 */
async function getUnaccountedKillmails() {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        return await conn.query("SELECT * FROM killmail_data WHERE accounted = 0");
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

async function getKillmailParticipants(killmail_id) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        return await conn.query("SELECT * FROM killmail_users WHERE killmail_id = ?", [killmail_id]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

async function addUserAmount(user_id, amount = 0) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("SELECT * FROM users WHERE user_id = ?", [user_id]).then(async user => {
            if (user.length > 0) {
                await conn.query("UPDATE users SET amount = amount + ? WHERE user_id = ?", [amount, user_id]);
            } else {
                await fetch("https://esi.evetech.net/latest/universe/names/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify([user_id])
                }).then(response => response.json()).then(async data => {
                    await addUser(data[0].name, user_id, "user", "").then(async () => {
                        await conn.query("UPDATE users SET amount = amount + ? WHERE user_id = ?", [amount, user_id]);
                    })
                })
            }
        })
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

async function getUsersWithRefreshToken() {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        return await conn.query("SELECT * FROM users WHERE refresh_token != ''");
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

async function getDBStatistics() {
    let conn;
    let retData = {}
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("SELECT COUNT(*) FROM users").then(async users => {
            retData.users = users[0]["COUNT(*)"];
        })
        await conn.query("SELECT * FROM payouts WHERE status = 'pending'").then(async pending => {
            retData.payouts = pending;
        })
        await conn.query("SELECT COUNT(*) FROM killmail_data WHERE accounted = 0").then(async unaccounted => {
            retData.unaccounted = unaccounted[0]["COUNT(*)"];
        })
        await conn.query("SELECT * FROM adm").then(async adm => {
            retData.adm = adm;
        })
        return retData;
    } catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
    }
}

async function setPayoutStatus(payout_id, status) {
    console.log(`Setting payout ${payout_id} to ${status}`);
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("UPDATE payouts SET status = ? WHERE id = ?", [status, payout_id]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

async function addSetting(path, value) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        // check if an entry with the same value and path already exists
        await conn.query("SELECT * FROM settings WHERE value = ? AND path = ?", [value, path]).then(async settings => {
            if (settings.length > 0) {
                console.error("Setting already exists");
            } else {
                await conn.query("INSERT INTO settings (value, path) VALUES (?, ?)", [value, path]);
            }
        })
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

/**
 * 
 * @param {string} path The path of the setting to get
 * @returns {Promise<{value: number, path: string, date: Date}[]>}
 */
async function getSettingsByPath(path) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        return await conn.query("SELECT * FROM settings WHERE path = ?", [path]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

async function deleteSetting(path, value) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("DELETE FROM settings WHERE value = ? AND path = ?", [value, path]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

async function updateSetting(path, oldValue, newValue) {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.query("USE bravebucks");
        await conn.query("UPDATE settings SET value = ? WHERE value = ? AND path = ?", [newValue, oldValue, path]);
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (conn) conn.end();
        
    }
}

export { setupDatabase, addPayoutRequest, addKillmail, addUser, getUsers, getPayouts, updatePayout, getKillmailsOnDay, getUserById, getUserByName, getKillmailsByUserId, setUserRole, deleteUser, setKillmailAccounted, getPayoutsByUserId, createPayoutRequest, setAdmData, getRefreshToken, updateRefreshToken, getAdmData, addAdmUser, getAdmUser, updateAdmUser, getUnaccountedKillmails, getKillmailParticipants, addUserAmount, getAdmUsers, getUsersWithRefreshToken, getDBStatistics, setPayoutStatus, addSetting, getSettingsByPath, deleteSetting, updateSetting };	