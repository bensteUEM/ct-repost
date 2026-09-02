import {
    createFilterHTML,
    parseSelectedFilterOptions,
    resetFilterOptions,
    saveFilterOptions,
} from "./filters";
import { renderCalendarAppointments } from "./calendars";
import { createPostFromAppointment } from "./posts";
import { getResourceNamesByAppointment } from "./resources";
import type {
    AppointmentCalculatedWithIncludes,
    Person,
    PostVisibility,
} from "./utils/ct-types";
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

function getCurrentPostOptions(document: Document): {
    postGroup: string;
    visibility: PostVisibility;
    skipDraft: boolean;
} {
    const postGroup = (
        document.getElementById("selectedPostGroup") as HTMLSelectElement
    ).value;
    const visibilityToggle = document.getElementById(
        "selectedVisibility",
    ) as HTMLInputElement;
    const skipDraftToggle = document.getElementById(
        "selectedSkipDraft",
    ) as HTMLInputElement;

    return {
        postGroup,
        visibility: visibilityToggle.checked ? "group_visible" : "group_intern",
        skipDraft: skipDraftToggle.checked,
    };
}

/**
 * Wrapper to apply new filter options
 * @returns void
 */
async function submitFilterOptions(document: Document = window.document) {
    /* retrieve filter option selectedCalendars from HTML form */
    const selectedFilters = await parseSelectedFilterOptions(document);

    const calendarAppointments = await Promise.all(
        selectedFilters.calendars.map((calendarId) =>
            churchtoolsClient.get<AppointmentCalculatedWithIncludes[]>(
                `/calendars/${calendarId}/appointments?from=${selectedFilters.fromDate.toLocaleDateString(
                    "en-ca",
                )}&to=${selectedFilters.toDate.toLocaleDateString("en-ca")}`,
            ),
        ),
    );

    const resourceNamesByAppointment = await getResourceNamesByAppointment(
        selectedFilters.fromDate,
        selectedFilters.toDate,
        selectedFilters.resources,
    );

    console.log("Resource Names by Appointment:", resourceNamesByAppointment);

    renderCalendarAppointments(
        calendarAppointments,
        document,
        resourceNamesByAppointment,
        (appointment) => {
            const postOptions = getCurrentPostOptions(document);
            return createPostFromAppointment(
                appointment,
                postOptions.postGroup,
                resourceNamesByAppointment,
                postOptions.visibility,
                postOptions.skipDraft,
            );
        },
    );

    console.log("Appointments:", calendarAppointments);
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
    <div class="container" id="appointmentListWrapper"></div>
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
    await resetFilterOptions();
}

main();
