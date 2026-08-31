import {
    createFilterHTML,
    parseSelectedFilterOptions,
    resetFilterOptions,
    saveFilterOptions,
} from "./filters";
import type { Person } from "./utils/ct-types";
import { churchtoolsClient } from "@churchtools/churchtools-client";

// only import reset.css in development mode
if (import.meta.env.MODE === "development") {
    //import("./utils/reset.css");
    import("../20251026_ct_styles.css");
}

declare const window: Window &
    typeof globalThis & {
        settings: { base_url?: string };
    };

const baseUrl = window.settings?.base_url ?? import.meta.env.VITE_BASE_URL;
churchtoolsClient.setBaseUrl(baseUrl);

const username = import.meta.env.VITE_USERNAME;
const password = import.meta.env.VITE_PASSWORD;

if (import.meta.env.MODE === "development" && username && password) {
    await churchtoolsClient.post("/login", { username, password });
}

const KEY = import.meta.env.VITE_KEY;
export { KEY };

/* end of initializiation */

const user = await churchtoolsClient.get<Person>(`/whoami`);

function setupButtonHandler(buttonId: string, handler: () => void) {
    const button = document.getElementById(buttonId);
    if (!button) {
        console.error(`Button #${buttonId} not found!`);
        return;
    }
    // Remove any previous listener to avoid duplicates
    button.replaceWith(button.cloneNode(true));
    const newButton = document.getElementById(buttonId) as HTMLButtonElement;
    newButton.addEventListener("click", handler);
}

/**
 * Wrapper to apply new filter options
 * @returns void
 */
async function submitFilterOptions(document: Document = window.document) {
    /* retrieve filter option selectedCalendars from HTML form */
    const selectedFilters = await parseSelectedFilterOptions(document);

    console.log("Submitted Filters:", selectedFilters);
}

/** Main plugin function */
async function main() {
    /* HTML Updates */
    //addBootstrapStyles();

    const app = document.querySelector<HTMLDivElement>("#app")!;
    app.innerHTML = `
<div class="container d-flex flex-column align-items-center justify-content-start min-vh-100 gap-3">
    <div class="container" id="filterWrapper"></div>
    <div class="container" id="chartsWrapper"></div>
    <div class="container" id="eventListWrapper"></div>
</div>
`;

    // Conditionally add dev-only welcome section
    if (import.meta.env.MODE === "development") {
        const devHeader = document.createElement("div");
        devHeader.className = "p-4 mb-4 bg-gray-100 rounded shadow text-center";

        const h1 = document.createElement("h1");
        h1.className = "text-4xl font-bold";
        h1.textContent = `Welcome ${user.firstName} ${user.lastName}`;

        const subDiv = document.createElement("div");
        subDiv.className = "text-gray-500 text-sm";
        subDiv.textContent = `ChurchTools at ${baseUrl}`;

        devHeader.appendChild(h1);
        devHeader.appendChild(subDiv);

        // Insert at the top of the container
        const container = app.querySelector(".container")!;
        container.insertBefore(devHeader, container.firstChild);
    }

    // Insert the filter DOM element into the placeholder
    const filterHTML = createFilterHTML();
    const filterWrapper =
        document.querySelector<HTMLDivElement>("#filterWrapper")!;
    filterWrapper.innerHTML = "";
    filterWrapper.appendChild(filterHTML);

    // additional setup links
    setupButtonHandler("resetFilterBtn", () => resetFilterOptions());
    setupButtonHandler("saveFilterBtn", () => saveFilterOptions(document));
    setupButtonHandler("submitFilterBtn", () => submitFilterOptions());
    resetFilterOptions();
}

main();
