import { Router } from "express";
import {
    addSetting,
    createPayoutRequest,
    deleteSetting,
    getDBStatistics,
    getPayouts,
    getSettingsByPath,
    getUserById,
    getUsers,
    setPayoutStatus,
    setUserRole,
    updateSetting,
} from "../mariadbController.js";

const ROUTER = Router();

function authCheck(req, res, next) {
    if (!req.user) {
        res.redirect("/auth/oauth2");
    } else if (req.user.role === "user") {
        res.redirect("/personal");
    } else {
        next();
    }
}

function adminCheck(req, res, next) {
    if (!req.user) {
        res.redirect("/auth/oauth2");
    } else if (req.user.role === "user") {
        res.redirect("/personal");
    } else if (req.user.role === "manager") {
        res.redirect("/management");
    } else if (req.user.role === "admin") {
        next();
    } else {
        res.redirect("/auth/logout");
    }
}

async function getPayoutData() {
    const payoutData = [];
    await getPayouts().then(async (payouts) => {
        for (const payout of payouts) {
            await getUserById(payout.user_id).then((user) => {
                payoutData.push({
                    id: payout.id,
                    user_id: payout.user_id,
                    username: user[0].username,
                    amount: payout.amount,
                    status: payout.status,
                    date: payout.date,
                });
            });
        }
    });
    payoutData.sort((a, b) => b.date.getTime() - a.date.getTime());
    return payoutData;
}

async function systemIdToName(systemId) {
    return await fetch(`https://esi.evetech.net/latest/universe/names/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify([systemId]),
    })
        .then((response) => {
            return response.json()
        })
        .then((data) => {
            return data[0].name;
        });
}

async function systemNameToId(systemName) {
    return await fetch(`https://esi.evetech.net/latest/universe/ids/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify([systemName]),
    })
        .then((response) => response.json())
        .then((data) => {
            return data.systems[0].id;
        });
}

async function allianceIdToName(allianceId) {
    return await fetch(`https://esi.evetech.net/latest/universe/names/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify([allianceId]),
    })
        .then((response) => {
            return response.json()
        })
        .then((data) => {
            return data[0].name;
        });
}

async function allianceNameToId(allianceName) {
    return await fetch(`https://esi.evetech.net/latest/universe/ids/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify([allianceName]),
    })
        .then((response) => response.json())
        .then((data) => {
            return data.alliance[0].id;
        });
}

async function corpIdToName(corpId) {
    return await fetch(`https://esi.evetech.net/latest/universe/names/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify([corpId]),
    })
        .then((response) => {
            return response.json()
        })
        .then((data) => {
            return data[0].name;
        });
}

async function corpNameToId(corpName) {
    return await fetch(`https://esi.evetech.net/latest/universe/ids/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify([corpName]),
    })
        .then((response) => response.json())
        .then((data) => {
            return data.corporation[0].id;
        });
}


async function getSettingsData() {
    const defenseSystems = [];
    await getSettingsByPath("defenseKills.eligibility.solarSystems").then(async (systems) => {
        for (const system of systems) {
            await systemIdToName(system.value).then((name) => {
                defenseSystems.push({value: system.value, name: name, path: system.path});
            });
        }
    })
    const offensiveSystems = [];
    await getSettingsByPath("offenseKills.eligibility.solarSystems").then(async (systems) => {
        for (const system of systems) {
            await systemIdToName(system.value).then((name) => {
                offensiveSystems.push({value: system.value, name: name, path: system.path});
            });
        }
    })
    const admSystems = [];
    await getSettingsByPath("adm.eligibility.solarSystems").then(async (systems) => {
        for (const system of systems) {
            await systemIdToName(system.value).then((name) => {
                admSystems.push({value: system.value, name: name, path: system.path});
            });
        }
    })
    const admEnabled = [];
    await getSettingsByPath("adm.enabled").then((enabled) => {
        if (enabled[0] != undefined && enabled[0] != null) {
        admEnabled.push({value: enabled[0].value, path: enabled[0].path});
        }
    })
    const offensiveEnabled = [];
    await getSettingsByPath("offenseKills.enabled").then((enabled) => {
        if (enabled[0] != undefined && enabled[0] != null) {
        offensiveEnabled.push({value: enabled[0].value, path: enabled[0].path});
        }
    })
    const defenseEnabled = [];
    await getSettingsByPath("defenseKills.enabled").then((enabled) => {
        if (enabled[0] != undefined && enabled[0] != null) {
        defenseEnabled.push({value: enabled[0].value, path: enabled[0].path});
        }
    })
    const amountRequired = [];
    await getSettingsByPath("amountRequired").then((amount) => {
        if (amount[0] != undefined && amount[0] != null) {
        amountRequired.push({value: amount[0].value, path: amount[0].path});
        }
    })
    const defenseIgnoreForeign = [];
    await getSettingsByPath("defenseKills.eligibility.ignoreForeign").then((ignore) => {
        if (ignore[0] != undefined && ignore[0] != null) {
        defenseIgnoreForeign.push({value: ignore[0].value, path: ignore[0].path});
        }
    })
    const defenseIgnoreFriendly = [];
    await getSettingsByPath("defenseKills.eligibility.ignoreFriendlyFire").then((ignore) => {
        if (ignore[0] != undefined && ignore[0] != null) {
        defenseIgnoreFriendly.push({value: ignore[0].value, path: ignore[0].path});
        }
    })
    const defenseMaxParticipants = [];
    await getSettingsByPath("defenseKills.eligibility.maxParticipants").then((max) => {
        if (max[0] != undefined && max[0] != null) {
        defenseMaxParticipants.push({value: max[0].value, path: max[0].path});
        }
    })
    const offenseIgnoreForeign = [];
    await getSettingsByPath("offenseKills.eligibility.ignoreForeign").then((ignore) => {
        if (ignore[0] != undefined && ignore[0] != null) {
        offenseIgnoreForeign.push({value: ignore[0].value, path: ignore[0].path});
        }
    })
    const offenseIgnoreFriendly = [];
    await getSettingsByPath("offenseKills.eligibility.ignoreFriendlyFire").then((ignore) => {
        if (ignore[0] != undefined && ignore[0] != null) {
        offenseIgnoreFriendly.push({value: ignore[0].value, path: ignore[0].path});
        }
    })
    const offenseMaxParticipants = [];
    await getSettingsByPath("offenseKills.eligibility.maxParticipants").then((max) => {
        if (max[0] != undefined && max[0] != null) {
        offenseMaxParticipants.push({value: max[0].value, path: max[0].path});
        }
    })
    const offensiveVictimAlliance = [];
    await getSettingsByPath("offenseKills.eligibility.victimAlliance").then(async (alliance) => {
        if (alliance[0] != undefined && alliance[0] != null) {
        await allianceIdToName(alliance[0].value).then((name) => {
            offensiveVictimAlliance.push({value: alliance[0].value, name: name, path: alliance[0].path});
        });
        }
    })
    const offensiveVictimCorporation = [];
    await getSettingsByPath("offenseKills.eligibility.victimCorporation").then(async (corp) => {
        if (corp[0] != undefined && corp[0] != null) {
        await corpIdToName(corp[0].value).then((name) => {
            
            offensiveVictimCorporation.push({value: corp[0].value, name: name, path: corp[0].path});
        });
        }
    })
    const offenseMatchLocationAndVictim = [];
    await getSettingsByPath("offenseKills.eligibility.matchLocationAndVictim").then((match) => {
        if (match[0] != undefined && match[0] != null) {
        offenseMatchLocationAndVictim.push({value: match[0].value, path: match[0].path});
        }
    })
    const payoutsAccountPods = [];
    await getSettingsByPath("payouts.accountPodKills").then((account) => {
        if (account[0] != undefined && account[0] != null) {
        payoutsAccountPods.push({value: account[0].value, path: account[0].path});
        }
    })
    const payoutsAmountsAdmPool = [];
    await getSettingsByPath("payouts.amounts.admPool").then((amount) => {
        if (amount[0] != undefined && amount[0] != null) {
        payoutsAmountsAdmPool.push({value: amount[0].value, path: amount[0].path});
        }
    })
    const payoutsAmountsKillFlat = [];
    await getSettingsByPath("payouts.amounts.killFlat").then((amount) => {
        if (amount[0] != undefined && amount[0] != null) {
        payoutsAmountsKillFlat.push({value: amount[0].value, path: amount[0].path});
        }
    })
    const payoutsAmountsKillPool = [];
    await getSettingsByPath("payouts.amounts.killPool").then((amount) => {
        if (amount[0] != undefined && amount[0] != null) {
        payoutsAmountsKillPool.push({value: amount[0].value, path: amount[0].path});
        }
    })
    const loggingKillmailProcessing = [];
    await getSettingsByPath("logging.killmailProcessing").then((logging) => {
        if (logging[0] != undefined && logging[0] != null) {
        loggingKillmailProcessing.push({value: logging[0].value, path: logging[0].path});
        }
    })
    const loggingKillmailSocketPing = [];
    await getSettingsByPath("logging.killmailSocketPing").then((logging) => {
        if (logging[0] != undefined && logging[0] != null) {
        loggingKillmailSocketPing.push({value: logging[0].value, path: logging[0].path});
        }
    })
    const loggingPayouts = [];
    await getSettingsByPath("logging.payouts").then((logging) => {
        if (logging[0] != undefined && logging[0] != null) {
        loggingPayouts.push({value: logging[0].value, path: logging[0].path});
        }
    })

    return {
        defenseSystems: defenseSystems,
        offensiveSystems: offensiveSystems,
        admSystems: admSystems,
        admEnabled: admEnabled,
        offensiveEnabled: offensiveEnabled,
        defenseEnabled: defenseEnabled,
        amountRequired: amountRequired,
        defenseIgnoreForeign: defenseIgnoreForeign,
        defenseIgnoreFriendly: defenseIgnoreFriendly,
        defenseMaxParticipants: defenseMaxParticipants,
        offenseIgnoreForeign: offenseIgnoreForeign,
        offenseIgnoreFriendly: offenseIgnoreFriendly,
        offenseMaxParticipants: offenseMaxParticipants,
        offensiveVictimAlliance: offensiveVictimAlliance,
        offensiveVictimCorporation: offensiveVictimCorporation,
        offenseMatchLocationAndVictim: offenseMatchLocationAndVictim,
        payoutsAccountPods: payoutsAccountPods,
        payoutsAmountsAdm: payoutsAmountsAdmPool,
        payoutsAmountsKillFlat: payoutsAmountsKillFlat,
        payoutsAmountsKillPool: payoutsAmountsKillPool,
        loggingKillmailProcessing: loggingKillmailProcessing,
        loggingKillmailSocketPing: loggingKillmailSocketPing,
        loggingPayouts: loggingPayouts,
    }
}


ROUTER.get("/", authCheck, async (req, res) => {
    res.render("management/management", {
        user: req.user,
        killPool: await getSettingsByPath("payouts.amounts.killPool").then(
            (data) => {
                return data[0].value;
            }
        ),
        killFlat: await getSettingsByPath("payouts.amounts.killFlat").then((data) => {
            return data[0].value;
        }),
        amountRequired: await getSettingsByPath("amountRequired").then((data) => {
            return data[0].value;
        }),
        statistics: await getDBStatistics(),
    });
});


ROUTER.get("/requests", authCheck, async (req, res) => {
    res.render("management/requests", {
        user: req.user,
        requests: await getPayoutData(),
    });
});

ROUTER.get("/requests/approve", authCheck, async (req, res) => {
    if (req.query.id) {
        setPayoutStatus(req.query.id, "paid");
    }
    res.redirect("/management/requests");
});

ROUTER.get("/requests/deny", authCheck, async (req, res) => {
    if (req.query.id) {
        setPayoutStatus(req.query.id, "denied");
    }
    res.redirect("/management/requests");
});

ROUTER.get("/users", authCheck, async (req, res) => {
    res.render("management/users", {
        user: req.user,
        amountRequired: await getSettingsByPath("amountRequired").then((data) => {
            return data[0].value;
        }),
        users: await getUsers().then((users) => {
            users.sort((a, b) => a.username.localeCompare(b.username));
            return users;
        }),
    });
});

// ROUTER.get("/users/delete", authCheck, async (req, res) => {
//     if (req.query.id) {
//         deleteUser(req.query.id);
//     }
//     res.redirect("/management/users");
// })

// ROUTER.get("/users/invalidate", authCheck, async (req, res) => {
//     if (req.query.id) {
//         updateRefreshToken(req.query.id, "");
//     }
//     res.redirect("/management/users");
// })

ROUTER.get("/users/force", authCheck, async (req, res) => {
    if (req.query.id) {
        createPayoutRequest(req.query.id);
    }
    res.redirect("/management/users");
});

ROUTER.get("/settings", adminCheck, async (req, res) => {
    res.render("management/settings", {
        user: req.user,
        users: await getUsers().then((users) => {
            users.sort((a, b) => a.username.localeCompare(b.username));
            return users;
        }),
        settings: await getSettingsData(),
    });
});

ROUTER.get("/settings/role", adminCheck, async (req, res) => {
    if (req.query.id && req.query.role) {
        setUserRole(req.query.id, req.query.role);
    }
    res.redirect("/management/settings");
});

ROUTER.get("/settings/delete", adminCheck, async (req, res) => {
    if (req.query.path && req.query.value) {
        deleteSetting(req.query.path, req.query.value);
    }
    res.redirect("/management/settings");
});

ROUTER.get("/settings/toggle", adminCheck, async (req, res) => {
    if (req.query.path && req.query.value) {
        if (req.query.value == 1) {
            updateSetting(req.query.path, req.query.value, 0);
        } else if (req.query.value == 0) {
            updateSetting(req.query.path, req.query.value, 1);
        } else {
            console.warn("Invalid value");
        }
    }
    res.redirect("/management/settings");
});

ROUTER.get("/settings/update", adminCheck, async (req, res) => {
    console.log(req.query.path, req.query.oldValue, req.query.newValue);
    if (req.query.path && req.query.oldValue && req.query.newValue) {
        updateSetting(req.query.path, req.query.oldValue, req.query.newValue);
    }
    res.redirect("/management/settings");
});

ROUTER.get("/settings/add", adminCheck, async (req, res) => {
    if (req.query.path && req.query.value) {
        switch (req.query.path) {
        case "offenseKills.eligibility.victimAlliance":
            addSetting(req.query.path, await allianceNameToId(req.query.value));
            break;
        case "offenseKills.eligibility.victimCorporation":
            addSetting(req.query.path, await corpNameToId(req.query.value));
            break;
        case "offenseKills.eligibility.solarSystems":
            addSetting(req.query.path, await systemNameToId(req.query.value));
            break;
        case "defenseKills.eligibility.solarSystems":
            addSetting(req.query.path, await systemNameToId(req.query.value));
            break;
        case "adm.eligibility.solarSystems":
            addSetting(req.query.path, await systemNameToId(req.query.value));
            break;
        default:
            console.warn("Invalid path");
            break;
        }
    }
    res.redirect("/management/settings");
});

export default ROUTER;
