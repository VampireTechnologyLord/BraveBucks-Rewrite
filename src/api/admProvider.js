class SovData {

    solar_system_name = "ERROR";
    solar_system_id = -1;
    vulnerability_occupancy_level = -1;

    constructor(sov_data) {
        this.sov_data = sov_data;
    }

    /**
     * Get the alliance ID of the owner of the structure
     * @returns {number} The alliance ID of the owner of the structure
     */
    getAllianceID() {
        return this.sov_data.alliance_id;
    }

    /**
     * Get the solar system ID of the structure
     * @returns {number} The solar system ID of the structure
     */
    getSolarSystemID() {
        return this.sov_data.solar_system_id;
    }

    /**
     * Get the structure ID
     * @returns {number} The structure ID
     */
    getStructureID() {
        return this.sov_data.structure_id;
    }

    /**
     * Get the structure type ID
     * @returns {number} The structure type ID
     */
    getStructureTypeID() {
        return this.sov_data.structure_type_id;
    }

    /**
     * Get the vulnerability occupancy level
     * @returns {number} The vulnerability occupancy level
     */
    getVulnerabilityOccupancyLevel() {
        return this.sov_data.vulnerability_occupancy_level;
    }

    /**
     * Get the vulnerability end time
     * @returns {string} The vulnerability end time
     */
    getVulnerableEndTime() {
        return this.sov_data.vulnerable_end_time;
    }

    /**
     * Get the vulnerability start time
     * @returns {string} The vulnerability start time
     */
    getVulnerableStartTime() {
        return this.sov_data.vulnerable_start_time;
    }

    /**
     * Get the solar system name
     * @returns {string} The solar system name
     */
    getSolarSystemName() {
        return this.solar_system_name;
    }
}

class AdmProvider {

    /** @type {SovData[]} */
    structure_data = [];
    /**
     * @type {{solar_system_id: number, solar_system_name: string, structure_id: number, structure_type_id: number, vulnerability_occupancy_level: number, vulnerable_end_time: string, vulnerable_start_time: string}[]}
     */
    complete_data = []
    /**
     * Create a new ADM provider
     * @param {number[]} system_ids The system IDs to get ADM data for
     */
    constructor(system_ids) {
        this.system_ids = system_ids;
        this.structure_data = [];
        this.complete_data = [];
    }

    async getStructureData() {
        this.structure_data = [];
        await fetch("https://esi.evetech.net/latest/sovereignty/structures/").then((response) => response.json()).then((data) => {
            data.forEach((structure) => {
                if (this.system_ids.includes(structure.solar_system_id)) {
                    this.structure_data.push(new SovData(structure));
                }
            })
        });
    }

    async getSystemNames() {
        this.complete_data = []; 
        let names = {};
        await fetch("https://esi.evetech.net/latest/universe/names/", {
            method: "POST",
            body: JSON.stringify(this.system_ids),
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => response.json()).then((data) => {
            data.forEach((name) => {
                names[name.id] = name.name;
            });
        });
        this.structure_data.forEach((structure) => {
            structure.solar_system_name = names[structure.getSolarSystemID()];
            structure.solar_system_id = structure.getSolarSystemID();
            structure.vulnerability_occupancy_level = structure.getVulnerabilityOccupancyLevel();
            this.complete_data.push(structure);
        });
    }
}

export { AdmProvider, SovData };