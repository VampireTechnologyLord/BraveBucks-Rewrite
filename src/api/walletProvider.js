import dotenv from "dotenv";
dotenv.config({ path: "./src/config/.env" });

class WalletEntry {
    constructor(wallet_data) {
        this.wallet_data = wallet_data;
    }

    /**
     * Get the transaction amount of the wallet entry
     * @returns {number} The transaction amount of the wallet entry
     */
    getAmount() {
        return this.wallet_data.amount;
    }

    /**
     * Get the balance of the wallet entry
     * @returns {number} The balance of the wallet entry
     */
    getBalance() {
        return this.wallet_data.balance;
    }

    /**
     * Get the context id of the wallet entry
     * @returns {number | null} The context id of the wallet entry
     */
    getContextId() {
        if (this.wallet_data.context_id == undefined || this.wallet_data.context_id == null) {
            return null;
        } else {
            return this.wallet_data.context_id;
        }
    }

    /**
     * Get the context id type of the wallet entry
     * @returns {string} The context id type of the wallet entry
     */
    getContextIdType() {
        return this.wallet_data.context_id_type;
    }

    /**
     * Get the date of the wallet entry
     * @returns {Date} The date of the wallet entry
     */
    getDate() {
        return new Date(this.wallet_data.date);
    }

    /**
     * Get the description of the wallet entry
     * @returns {string} The description of the wallet entry
     */
    getDescription() {
        return this.wallet_data.description;
    }

    /**
     * Get the first party id of the wallet entry
     * @returns {number | null} The first party id of the wallet entry
     */
    getFirstPartyId() {
        if (this.wallet_data.first_party_id == undefined || this.wallet_data.first_party_id == null) {
            return null;
        } else {
            return this.wallet_data.first_party_id;
        }
    }

    /**
     * Get the first party id type of the wallet entry
     * @returns {number} The id of the wallet entry
     */
    getId() {
        return this.wallet_data.id;
    }

    /**
     * Get the reason of the wallet entry
     * @returns {string | null} The reason of the wallet entry
     */
    getReason() {
        if (this.wallet_data.reason == undefined || this.wallet_data.reason == null) {
            return null;
        } else {
            return this.wallet_data.reason;
        }
    }

    /**
     * Get the ref id of the wallet entry
     * @returns {string} The ref type of the wallet entry
     */
    getRefType() {
        return this.wallet_data.ref_type;
    }

    /**
     * Get the second party id of the wallet entry
     * @returns {number | null} The second party id of the wallet entry
     */
    getSecondPartyId() {
        if (this.wallet_data.second_party_id == undefined || this.wallet_data.second_party_id == null) {
            return null;
        } else {
            return this.wallet_data.second_party_id;
        }
    }

    /**
     * Get the tax amount of the wallet entry
     * @returns {number} The tax of the wallet entry
     */
    getTax() {
        if (this.wallet_data.tax == undefined || this.wallet_data.tax == null) {
            return null;
        } else {
            return this.wallet_data.tax;
        }
    }

    /**
     * Get the tax receiver id of the wallet entry
     * @returns {number | null} The tax receiver id of the wallet entry
     */
    getTaxReceiverId() {
        if (this.wallet_data.tax_receiver_id == undefined || this.wallet_data.tax_receiver_id == null) {
            return null;
        } else {
            return this.wallet_data.tax_receiver_id;
        }
    }
}


class WalletData {
    constructor(wallet_data) {
        this.wallet_data = wallet_data;
    }

    /**
     * Get the wallet entries
     * @returns {WalletEntry[]} An array of wallet entries
     */
    getEntries() {
        const entries = [];
        this.wallet_data.forEach(entry => {
            entries.push(new WalletEntry(entry));
        });
        return entries;
    }
}


class WalletProvider {
    constructor(user_id, access_token) {
        this.user_id = user_id;
        this.access_token = access_token;
        this.url = `https://esi.evetech.net/latest/characters/${this.user_id}/wallet/journal/`;
    }

    async getWalletJournal() {
        const header = new Headers();
        header.append("Authorization", `Bearer ${this.access_token}`);
        await fetch(this.url, {
            method: "GET",
            headers: header,
        })
            .then((response) => response.json())
            .then((wallet_data) => {
                return wallet_data;
            });

    }

}


export { WalletProvider, WalletData }