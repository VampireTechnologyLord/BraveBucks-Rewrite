import WebSocket from "ws";
import ReconnectingWebSocket from "reconnecting-websocket";
import { logging } from "../logger.js";

const ZKILLBOARD_WS_URL = "wss://zkillboard.com/websocket/";
const PAYLOAD = {
    "action":"sub",
    "channel":"killstream"
}

class __Attacker {
    /**
     * Create a new Attacker object
     * @param {any} attacker_data The attacker data
     */
    constructor(attacker_data) {
        this.attacker_data = attacker_data;
    }

    /**
     * Get the alliance ID of the attacker
     * @returns {number} The alliance ID of the attacker
     */
    getAllianceID() {
        if (this.attacker_data.hasOwnProperty("alliance_id")) {
            return this.attacker_data.alliance_id;
        } else {
            return null;
        }
    }
    
    /**
     * Get the character ID of the attacker
     * @returns {number} The character ID of the attacker
     */
    getCharacterID() {
        return this.attacker_data.character_id;
    }
    
    /**
     * Get the corporation ID of the attacker
     * @returns {number} The corporation ID of the attacker
     */
    getCorporationID() {
        return this.attacker_data.corporation_id;
    }
    
    /**
     * Get the damage done by the attacker
     * @returns {number} The damage done by the attacker
     */
    getDamageDone() {
        return this.attacker_data.damage_done;
    }

    /**
     * Get the final blow status of the attacker
     * @returns {boolean} Whether the attacker got the final blow
     */
    getFinalBlow() {
        return this.attacker_data.final_blow;
    }

    /**
     * Get the security status of the attacker
     * @returns {number} The security status of the attacker
     */
    getSecurityStatus() {
        return this.attacker_data.security_status;
    }

    /**
     * Get the ship type ID of the attacker
     * @returns {number} The ship type ID of the attacker
     */
    getShipTypeID() {
        return this.attacker_data.ship_type_id;
    }

    /**
     * Get the weapon type ID of the attacker
     * @returns {number} The weapon type ID of the attacker
     */
    getWeaponTypeID() {
        return this.attacker_data.weapon
    }
}

class __Victim {
    /**
     * Create a new Victim object
     * @param {any} victim_data The victim data
     */
    constructor(victim_data) {
        this.victim_data = victim_data;
    }

    /**
     * Get the character ID of the victim
     * @returns {number} The character ID of the victim
     */
    getCharacterID() {
        return this.victim_data.character_id;
    }

    /**
     * Get the corporation ID of the victim
     * @returns {number} The corporation ID of the victim
     */
    getCorporationID() {
        return this.victim_data.corporation_id;
    }

    /**
     * Get the alliance ID of the victim
     * @returns {number | null} The alliance ID of the victim
     */
    getAllianceID() {
        return this.victim_data.alliance_id || null;
    }

    /**
     * Get the amount of damage taken by the victim
     * @returns {number} The damage taken by the victim
     */
    getDamageTaken() {
        return this.victim_data.damage_taken;
    }

    /**
     * Get the ship type ID of the victim
     * @returns {number} The ship type ID of the victim
     */
    getShipTypeID() {
        return this.victim_data.ship_type_id;
    }

}

class __ZKB {
    /**
     * Create a new ZKB object
     * @param {any} zkb_data The ZKB data
     */
    constructor (zkb_data) {
        this.zkb_data = zkb_data;
    }

    /**
     * Get the location ID
     * @returns {number} The location ID
     */
    getLocationID() {
        return this.zkb_data.locationID;
    }

    /**
     * Get the hash of the killmail
     * @returns {string} The hash of the killmail
     */
    getHash() {
        return this.zkb_data.hash;
    }

    /**
     * Get the fitted value of the destroyed ship
     * @returns {number} The fitted value
     */
    getFittedValue() {
        return this.zkb_data.fittedValue;
    }

    /**
     * Get the dropped value of the destroyed ship
     * @returns {number} The dropped value
     */
    getDroppedValue() {
        return this.zkb_data.droppedValue;
    }

    /**
     * Get the destroyed value of the destroyed ship
     * @returns {number} The destroyed value
     */
    getDestroyedValue() {
        return this.zkb_data.destroyedValue;
    }

    /**
     * Get the total value of the destroyed
     * @returns {number} The total value of the destroyed ship
     */
    getTotalValue() {
        return this.zkb_data.totalValue;
    }

    /**
     * Get the points of the killmail
     * @returns {number} The points of the killmail
     */
    getPoints() {
        return this.zkb_data.points;
    }

    /**
     * Get the NPC status of the killmail
     * @returns {boolean} Whether the killmail was a NPC killmail
     */
    getNpc() {
        return this.zkb_data.npc;
    }

    /**
     * Get the solo status of the killmail
     * @returns {boolean} Whether the killmail was a solo killmail
     */
    getSolo() {
        return this.zkb_data.solo;
    }

    /**
     * Get the awox status of the killmail
     * @returns {boolean} Whether the killmail was an awox killmail
     */
    getAwox() {
        return this.zkb_data.awox;
    }

    /**
     * Get the status labels of the killmail
     * @returns {string[]} The labels of the killmail
     */
    getLabels() {
        return this.zkb_data.labels;
    }

    /**
     * Get the ESI URL of the killmail
     * @returns {string} The ESI URL of the killmail
     */
    getESI() {
        return this.zkb_data.esi;
    }

    /**
     * Get the URL of the killmail
     * @returns {string} The URL of the killmail
     */
    getURL() {
        return this.zkb_data.url;
    }
}

class _Killmail {
    /**
     * Create a new Killmail object
     * @param {any} killmail_data The killmail data
     */
    constructor(killmail_data) {
        this.killmail_data = killmail_data;
    }

    /**
     * Get the attackers of the killmail
     * @returns {__Attacker[]} An array of Attacker objects
     */
    getAttackers() {
        return this.killmail_data.attackers.map(attacker => new __Attacker(attacker));
    }

    /**
     * Get the killmail ID
     * @returns {number} The killmail ID
     */
    getKillmailID() {
        return this.killmail_data.killmail_id;
    }

    /**
     * Get the time the killmail was created
     * @returns {string} The time the killmail was created
     */
    getKillmailTime() {
        return Date(this.killmail_data.killmail_time);
    }

    /**
     * Get the solar system ID
     * @returns {number} The solar system ID
     */
    getSolarSystemID() {
        return this.killmail_data.solar_system_id;
    }

    /**
     * Get the victim of the killmail
     * @returns {__Victim} The victim of the killmail
     */
    getVictim() {
        return new __Victim(this.killmail_data.victim);
    }
    
    /**
     * Get the ZKB object of the killmail
     * @returns {__ZKB} The ZKB object of the killmail
     */
    getZKB() {
        return new __ZKB(this.killmail_data.zkb);
    }
}

class KillmailProvider {
    /**
     * Create a new KillmailProvider
     */
    constructor() {
        // this.ws = new WebSocket(ZKILLBOARD_WS_URL);
        // this.ws.on("open", () => {
        //     this.ws.send(JSON.stringify(PAYLOAD));
        //     loggerKmPing(console.info("Connected to ZKillboard WebSocket"));
        // });
        // this.ws.on("close", () => {
        //     loggerKmPing(console.warn("Connection to ZKillboard WebSocket closed"));
        // });
        // this.ws.on("error", (err) => {
        //     loggerKmPing(console.error("Error in ZKillboard WebSocket connection: " + err));
        // });
        // // add a function to send an empty payload to the websocket to keep the connection alive
        // setInterval(() => {
        //     this.ws.send(JSON.stringify({}));
        //     loggerKmPing(console.info("Sent keep-alive message to ZKillboard WebSocket"));
        // }, 60 * 1000);
        this.ws = new ReconnectingWebSocket(ZKILLBOARD_WS_URL, [], {
            minReconnectionDelay: 1000,
            maxReconnectionDelay: 2000,
            WebSocket: WebSocket
        });
        this.ws.addEventListener("open", () => {
            this.ws.send(JSON.stringify(PAYLOAD));
            logging("info", "killmailSocketPing", "Connected to ZKillboard WebSocket");
        });
        this.ws.addEventListener("close", () => {
            logging("warn", "killmailSocketPing", "Connection to ZKillboard WebSocket closed");
        });
        this.ws.addEventListener("error", (err) => {
            logging("error", "killmailSocketPing", "Error in ZKillboard WebSocket connection: " + err);
        });

    }

    /**
     * Listen for killmails
     * @param {JSON} callback The callback function
     */
    onKillmail(callback) {
        this.ws.addEventListener("message", (event) => {
            callback(JSON.parse(event.data));
        });
    }
}

export {KillmailProvider, _Killmail as Killmail};