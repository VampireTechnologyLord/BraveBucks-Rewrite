import { KillmailProvider, Killmail } from "./killmailProvider.js";
import dotenv from "dotenv";
import { addKillmail, getSettingsByPath } from "../mariadbController.js";
import { logging } from "../logger.js";

dotenv.config({ path: "./src/config/.env" });

const KM_PROVIDER = new KillmailProvider();
const ALLIANCE_ID = process.env.ALLIANCE_ID;

/**
 *
 * @param {Killmail} killmail The killmail to register
 */
async function registerKillmail(killmail, defensive) {
    const participants = killmail.getAttackers();
    await fetch(
        `https://esi.evetech.net/latest/characters/${killmail
            .getVictim()
            .getCharacterID()}/`
    )
        .then((charResponse) => charResponse.json())
        .then(async (charData) => {
            if (killmail.getVictim().getAllianceID() == null) {
                await fetch(
                    `https://esi.evetech.net/latest/corporations/${killmail
                        .getVictim()
                        .getCorporationID()}/`
                )
                    .then((corpResponse) => corpResponse.json())
                    .then(async (corpData) => {
                        const participantIds = [];
                        participants.filter(
                            (participant) =>
                                participant.getAllianceID() == ALLIANCE_ID
                        );
                        participants.forEach((participant) => {
                            participantIds.push(participant.getCharacterID());
                        });
                        participantIds.filter((participant) => participant != null && participant != undefined);
                        await addKillmail(killmail.getKillmailID(), participantIds, charData.name, null, corpData.name, killmail.getVictim().getShipTypeID(), killmail.getZKB().getPoints(), defensive);
                    });
            } else {
                await fetch(
                    `https://esi.evetech.net/latest/alliances/${killmail
                        .getVictim()
                        .getAllianceID()}/`
                )
                    .then((allianceResponse) => allianceResponse.json())
                    .then(async (allianceData) => {
                        await fetch(
                            `https://esi.evetech.net/latest/corporations/${killmail
                                .getVictim()
                                .getCorporationID()}/`
                        )
                            .then((corpResponse) => corpResponse.json())
                            .then(async (corpData) => {
                                const participantIds = [];
                                participants.filter(
                                    (participant) =>
                                        participant.getAllianceID() ==
                                        ALLIANCE_ID
                                );
                                participants.forEach((participant) => {
                                    participantIds.push(
                                        participant.getCharacterID()
                                    );
                                });
                                participantIds.filter(
                                    (participant) => participant != null && participant != undefined
                                );
                                await addKillmail(
                                    killmail.getKillmailID(),
                                    participantIds,
                                    charData.name,
                                    allianceData.name,
                                    corpData.name,
                                    killmail.getVictim().getShipTypeID(),
                                    killmail.getZKB().getPoints(),
                                    defensive
                                );
                            });
                    });
            }
        });
}

KM_PROVIDER.onKillmail(async (killmailData) => {
    logging("info", "killmailProcessing", `Received killmail ${killmailData.killmail_id}`);

    const killmail = new Killmail(killmailData);
    const attackers = killmail.getAttackers();
    const solarSystemID = killmail.getSolarSystemID();
    const victim = killmail.getVictim();
    const defenseSystemsIDS = await getSettingsByPath("defenseKills.eligibility.solarSystems").then((data) => data.map((system) => system.value));
    const defensiveMaxParticipants = await getSettingsByPath("defenseKills.eligibility.maxParticipants").then((data) => data[0].value);
    const defenseKillsEnabled = await getSettingsByPath("defenseKills.enabled").then((data) => data[0].value);
    const offensiveSystemsIDS = await getSettingsByPath("offenseKills.eligibility.solarSystems").then((data) => data.map((system) => system.value));
    const offensiveAllianceIDS = await getSettingsByPath("offenseKills.eligibility.victimAlliance").then((data) => data.map((alliance) => alliance.value));
    const offensiveCorporationIDS = await getSettingsByPath("offenseKills.eligibility.victimCorporation").then((data) => data.map((corp) => corp.value));
    const offensiveMaxParticipants = await getSettingsByPath("offenseKills.eligibility.maxParticipants").then((data) => data[0].value);
    const offensiveKillsEnabled = await getSettingsByPath("offenseKills.enabled").then((data) => data[0].value);
    const matchLocationAndVictim = await getSettingsByPath("offenseKills.eligibility.matchLocationAndVictim").then((data) => data[0].value);
    const ignoreFriendlyFire = await getSettingsByPath("offenseKills.eligibility.ignoreFriendlyFire").then((data) => data[0].value);
    const ignoreForeign = await getSettingsByPath("offenseKills.eligibility.ignoreForeign").then((data) => data[0].value);

    if (attackers.some((attacker) => attacker.getAllianceID() == ALLIANCE_ID)) {
        if (defenseKillsEnabled && defenseSystemsIDS.includes(solarSystemID)) {
            if (ignoreForeign == 1){
                attackers.filter(
                    (attacker) => attacker.getAllianceID() == ALLIANCE_ID
                );
            }
            if (attackers.length <= defensiveMaxParticipants) {
                if (
                    victim.getAllianceID() == ALLIANCE_ID &&
                    !ignoreFriendlyFire == 1
                ) {
                    logging("info", "killmailProcessing", "Killmail registered")
                    await registerKillmail(killmail, true);
                } else if (
                    victim.getAllianceID() == ALLIANCE_ID &&
                    ignoreFriendlyFire == 1
                ) {
                    return;
                } else {
                    logging("info", "killmailProcessing", "Killmail registered")
                    await registerKillmail(killmail, true);
                }
            } else {
                logging("info", "killmailProcessing", "Too many participants - not registering killmail")
                return;
            }
        } else if (offensiveKillsEnabled) {
            if (matchLocationAndVictim) {
                if (
                    offensiveSystemsIDS.includes(solarSystemID) &&
                    (victim.getAllianceID() == offensiveAllianceIDS ||
                        victim.getCorporationID() == offensiveCorporationIDS)
                ) {
                    if (ignoreForeign == 1){
                        attackers.filter(
                            (attacker) =>
                                attacker.getAllianceID() == ALLIANCE_ID
                        );
                    }
                    if (attackers.length <= offensiveMaxParticipants) {
                        if (
                            victim.getAllianceID() == ALLIANCE_ID &&
                            !ignoreFriendlyFire == 1
                        ) {
                            await registerKillmail(killmail, false);
                            logging("info", "killmailProcessing", "Killmail registered")
                        } else if (
                            victim.getAllianceID() == ALLIANCE_ID &&
                            ignoreFriendlyFire == 1
                        ) {
                            logging("info", "killmailProcessing", "Victim is alliance member - not registering killmail")
                            return;
                        } else {
                            logging("info", "killmailProcessing", "Killmail registered")
                            await registerKillmail(killmail, false);
                        }
                    } else {
                        logging("info", "killmailProcessing", "Too many participants - not registering killmail")
                        return;
                    }
                } else {
                    logging("info", "killmailProcessing", "Killmail does not match offensive criteria - not registering killmail")
                    return;
                }
            } else {
                if (offensiveSystemsIDS.includes(solarSystemID)) {
                    if (ignoreForeign == 1){
                        attackers.filter(
                            (attacker) =>
                                attacker.getAllianceID() == ALLIANCE_ID
                        );
                    }
                    if (attackers.length <= offensiveMaxParticipants) {
                        if (
                            victim.getAllianceID() == ALLIANCE_ID &&
                            !ignoreFriendlyFire == 1
                        ) {
                            logging("info", "killmailProcessing", "Killmail registered")
                            await registerKillmail(killmail, false);
                        } else if (
                            victim.getAllianceID() == ALLIANCE_ID &&
                            ignoreFriendlyFire == 1
                        ) {
                            logging("info", "killmailProcessing", "Victim is alliance member - not registering killmail")
                            return;
                        } else {
                            logging("info", "killmailProcessing", "Killmail registered")
                            await registerKillmail(killmail, false);
                        }
                    } else {
                        logging("info", "killmailProcessing", "Too many participants - not registering killmail")
                        return;
                    }
                } else if (
                    victim.getAllianceID() == offensiveAllianceIDS ||
                    victim.getCorporationID() == offensiveCorporationIDS
                ) {
                    if (ignoreForeign == 1){
                        attackers.filter(
                            (attacker) =>
                                attacker.getAllianceID() == ALLIANCE_ID
                        );
                    }
                    if (attackers.length <= offensiveMaxParticipants) {
                        if (
                            victim.getAllianceID() == ALLIANCE_ID &&
                            !ignoreFriendlyFire == 1
                        ) {
                            logging("info", "killmailProcessing", "Killmail registered")
                            await registerKillmail(killmail, false);
                        } else if (
                            victim.getAllianceID() == ALLIANCE_ID &&
                            ignoreFriendlyFire == 1
                        ) {
                            logging("info", "killmailProcessing", "Victim is alliance member - not registering killmail")
                            return;
                        } else {
                            logging("info", "killmailProcessing", "Killmail registered")
                            await registerKillmail(killmail, false);
                        }
                    } else {
                        logging("info", "killmailProcessing", "Too many participants - not registering killmail")
                        return;
                    }
                } else {
                    logging("info", "killmailProcessing", "Killmail matches neither defensive nor offensive criteria")
                    return;
                }
            }
        } else {
            return;
        }
    } else {
        logging("info", "killmailProcessing", "Killmail does not contain alliance members - not registering killmail")
        return;
    }
});

const CALLING = 0;

export default CALLING;
