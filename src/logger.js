import { getSettingsByPath } from "./mariadbController.js";


/**
 * Logs a message to the console
 * @param {"info" | "log" | "warn" | "error"} type The type of log message
 * @param {"killmailProcessing" | "killmailSocketPing" | "payouts"} category The category of the log message
 * @param {string} message The message to log
 */
export function logging(type, category, message) {
    getSettingsByPath(`logging.${category}`).then((setting) => {
        if (setting[0].value === 1) {
            switch (type) {
                case "info":
                    console.info(message);
                    break;
                case "log":
                    console.log(message);
                    break;
                case "warn":
                    console.warn(message);
                    break;
                case "error":
                    console.error(message);
                    break;
                default:
                    console.log(message);
                    break;
            }
        }
    });
}