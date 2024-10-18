import { AdmProvider } from "./api/admProvider.js";
import { WalletData } from "./api/walletProvider.js";
import { logging } from "./logger.js";
import {
    getKillmailParticipants,
    getUnaccountedKillmails,
    addUserAmount,
    setKillmailAccounted,
    getUsersWithRefreshToken,
    getAdmUser,
    updateRefreshToken,
    getRefreshToken,
    getAdmData,
    setAdmData,
    updateAdmUser,
    getSettingsByPath,
} from "./mariadbController.js";
import dotenv from "dotenv";
dotenv.config({ path: "./src/config/.env" });

const ACCOUNT_POD_KILLS = await getSettingsByPath("payouts.accountPodKills").then((data) => data[0].value)
const KILL_POOL = await getSettingsByPath("payouts.amounts.killPool").then((data) => data[0].value)
const ADM_POOL = await getSettingsByPath("payouts.amounts.admPool").then((data) => data[0].value)
const ADM_SYSTEMS = await getSettingsByPath("adm.eligibility.solarSystems").then((data) => data.map((system) => system.value));
const KILL_FLAT = await getSettingsByPath("payouts.amounts.killFlat").then((data) => data[0].value)
const SCOPE = "esi-wallet.read_character_wallet.v1";

async function createKillmailPayouts() {
    logging("info", "payouts", "Starting killmail payout calculation");
    const killmails = await getUnaccountedKillmails();
    if (killmails.length == 0) {
        logging("info", "payouts", "No unaccounted killmails found");
        return;
    }

    let totalPoints = 0;

    const killmailData = [];
    for (let i = 0; i < killmails.length; i++) {
        const killmail = killmails[i];
        if (ACCOUNT_POD_KILLS === false && killmail.ship_type_id === 670) {
            continue;
        }
        const smoothedPoints = (killmail.points = Math.round(
            Math.sqrt(killmail.points) * 3
        ));
        totalPoints += smoothedPoints;
        await getKillmailParticipants(killmail.killmail_id).then(
            (participants) => {
                killmailData.push({
                    killmail_id: killmail.killmail_id,
                    points: smoothedPoints,
                    defensive: killmail.defensive === 1,
                    participants: participants.map(
                        (participant) => participant.user_id
                    ),
                });
            }
        );
    }

    logging("info", "payouts", `${killmailData.length} killmails found with a total of ${totalPoints} points`);

    const payoutPerPoint = Number((KILL_POOL / totalPoints).toFixed(2));

    for (let i = 0; i < killmailData.length; i++) {
        const killmail = killmailData[i];
        const payout = Number((payoutPerPoint * killmail.points).toFixed(2));
        const payoutPerParticipant = Number(
            (payout / killmail.participants.length).toFixed(2)
        );
        for (let j = 0; j < killmail.participants.length; j++) {
            logging("info", "payouts", `Adding ${payoutPerParticipant} to user ${killmail.participants[j]} for killmail ${killmail.killmail_id}`);
            await addUserAmount(
                killmail.participants[j],
                payoutPerParticipant + KILL_FLAT
            );
        }
        await setKillmailAccounted(killmail.killmail_id);
    }

    logging("info", "payouts", "Killmail payout calculation finished");
}


/**
 * Fetches the ADM data for all users
 * @returns {Promise<[{user_id: number, admUserData:[{systemId: number, amount: number}]}]>}
 */
async function fetchAdmData() {
    const client_id = process.env.CLIENT_ID;
    const client_secret = process.env.CLIENT_SECRET;
    const admData = [];
    logging("info", "payouts", "Fetching ADM data");
    await getUsersWithRefreshToken().then(async (users) => {
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            await getAdmUser(user.user_id).then(async (adm_user) => {
                if (
                    adm_user[0].last_updated === null ||
                    new Date() - adm_user[0].last_updated > 1000 * 60 * 60 * 24
                ) {
                    const basicAuth = Buffer.from(
                        `${client_id}:${client_secret}`
                    ).toString("base64");
                    const content_type = "application/x-www-form-urlencoded";
                    const host = "login.eveonline.com";
                    await getRefreshToken(user.user_id).then(
                        async (raw_token) => {
                            if (raw_token[0].refresh_token.length <= 1) {
                                return null;
                            }
                            const refresh_token = raw_token[0].refresh_token;
                            const header = new Headers();
                            header.append(
                                "Authorization",
                                `Basic ${basicAuth}`
                            );
                            header.append("Content-Type", content_type);
                            header.append("Host", host);
                            const body = new URLSearchParams();
                            body.append("grant_type", "refresh_token");
                            body.append("refresh_token", refresh_token);
                            await updateRefreshToken(
                                user.user_id,
                                refresh_token
                            );
                            return await fetch(
                                `https://login.eveonline.com/v2/oauth/token?scope=${SCOPE}`,
                                {
                                    method: "POST",
                                    headers: header,
                                    body: body,
                                }
                            )
                                .then((response) => response.json())
                                .then(async (access_token) => {
                                    const journal_header = new Headers();
                                    journal_header.append("Authorization", `Bearer ${access_token.access_token}`);
                                    await fetch(`https://esi.evetech.net/latest/characters/${user.user_id}/wallet/journal/`, {
                                        method: "GET",
                                        headers: journal_header,
                                    }).then(async (response) => response.json()).then((journal) => {
                                    
                                            if (journal === null) {
                                                return;
                                            }
                                            const walletData = new WalletData(
                                                journal
                                            );
                                            const entries =
                                                walletData.getEntries();
                                            for (
                                                let i = 0;
                                                i < entries.length;
                                                i++
                                            ) {
                                                const entry = entries[i];
                                                if (
                                                    entry.getDate() >
                                                        adm_user[0]
                                                            .last_updated &&
                                                    entry.getRefType() ===
                                                        "bounty_prizes" &&
                                                    ADM_SYSTEMS.includes(
                                                        entry.getContextId()
                                                    )
                                                ) {
                                                    if (
                                                        !admData.some(
                                                            (adm) =>
                                                                adm.user_id ===
                                                                user.user_id
                                                        )
                                                    ) {
                                                        admData.push({
                                                            user_id:
                                                                user.user_id,
                                                            admUserData: [
                                                                {
                                                                    systemId:
                                                                        entry.getContextId(),
                                                                    amount: entry.getAmount(),
                                                                },
                                                            ],
                                                        });
                                                    } else {
                                                        const adm =
                                                            admData.find(
                                                                (adm) =>
                                                                    adm.user_id ===
                                                                    user.user_id
                                                            );
                                                        adm.admUserData.push({
                                                            systemId:
                                                                entry.getContextId(),
                                                            amount: entry.getAmount(),
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                    );
                                });
                        }
                    );
                }
            });
        }
    });
    return admData;
}

/**
 * Creates the ADM payouts for all users
 * @param {[{user_id: number, admUserData:[{systemId: number, amount: number}]}]} adm_data The ADM data for all users
 */
async function createAdmPayouts(adm_data) {
    logging("info", "payouts", "Starting ADM payout calculation");
    const admProvider = new AdmProvider(ADM_SYSTEMS)
    await admProvider.getStructureData().then(async () => {
        await admProvider.getSystemNames().then(async () => {
            const complete_data = admProvider.complete_data;
            
            const admData = [];
            for (let i = 0; i < complete_data.length; i++) {
                const system = complete_data[i];
                const adm = await getAdmData(system.solar_system_id);
                admData.push({
                    systemId: system.solar_system_id,
                    currentAdm: adm[0].adm_level,
                    weight: 4 / (1 + adm[0].adm_level),
                    totalAmount: 0,
                    users: [],
                });
            }
            
            for (let i = 0; i < adm_data.length; i++) {
                const user = adm_data[i];
                for (let j = 0; j < user.admUserData.length; j++) {
                    const admUserData = user.admUserData[j];
                    const system = admData.find(
                        (system) => system.systemId === admUserData.systemId
                    );
                    system.totalAmount += admUserData.amount;
                    system.users.push({
                        user_id: user.user_id,
                        amount: admUserData.amount,
                    });
                }
            }

            const totalAmount = admData.reduce(
                (acc, system) => acc + system.totalAmount * system.weight,
                0
            );
            const payoutPerPoint = Number((ADM_POOL / totalAmount).toFixed(2));
            for (let i = 0; i < admData.length; i++) {
                const system = admData[i];
                const payout = Number((system.totalAmount * system.weight * payoutPerPoint).toFixed(2));
                for (let j = 0; j < system.users.length; j++) {
                    const user = system.users[j];
                    const payoutPerUser = Number((user.amount * system.weight * payoutPerPoint).toFixed(2));
                    console.info(`Adding ${payoutPerUser} to user ${user.user_id} for system ${system.systemId}`);
                    await addUserAmount(user.user_id, payoutPerUser);
                    await updateAdmUser(user.user_id);
                }
            }
        })
    })
    admProvider.complete_data.forEach(async (system) => {
        setAdmData(system.solar_system_id, system.solar_system_name, system.vulnerability_occupancy_level);
    })
    logging("info", "payouts", "ADM payout calculation finished");
}

const doKillmailPayouts = createKillmailPayouts();
const doAdmPayouts = createAdmPayouts(await fetchAdmData())


export { doKillmailPayouts, doAdmPayouts };
