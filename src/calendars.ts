import { churchtoolsClient } from "@churchtools/churchtools-client";
import type {
    AppointmentBase,
    AppointmentCalculatedWithIncludes,
} from "./utils/ct-types";

/**
 * retrieve the first availables title from a list of calendars for a specified date
 * This can be used to retrieve special day names if each day has exactly one relevant specialdayname appointment
 *
 * @param date to lookfor
 * @param calendarIds used for lookup
 * @returns title of the first appointment matching both date and calendars
 */
export async function getSpecialDayName(
    date: Date,
    calendarIds: number[],
): Promise<string> {
    const fromToDate = date.toLocaleDateString("en-ca");

    for (const calendarId of calendarIds) {
        const response = await churchtoolsClient.get<
            AppointmentCalculatedWithIncludes[]
        >(
            `/calendars/${calendarId}/appointments?from=${fromToDate}&to=${fromToDate}`,
        );

        console.log(response);
        if (response.length > 0) {
            const title = response[0].appointment.base.title;
            return title;
        }
    }

    return "";
}

/** Workaround for missing CT Type
 * see https://forum.church.tools/topic/11586/r%C3%BCckfrage-zu-calendars-appointments-rtypes
 * https://github.com/bensteUEM/ct-iframes/issues/23
 *
 */
interface AppointmentResponse {
    appointment: AppointmentBase;
}

/**
 * fetch calendar appointment by id
 * @param calendarId
 * @param calendarAppointmentId
 * @returns appointment
 */
export async function getCalendarAppointment(
    calendarId: number,
    calendarAppointmentId: number,
): Promise<AppointmentBase> {
    const appointment: AppointmentResponse = await churchtoolsClient.get(
        `/calendars/${calendarId}/appointments/${calendarAppointmentId}`,
    );
    return appointment.appointment;
}

/** This function rewrites the calendar titles and subtitle to achieve a standartization diregarding typos
 * 1. check simple matches to keywords
 * 2. check special cases to keywords
 * 3. replace keywords with fulltext versions which can be appended to title
 *
 * @param name title to rewrite
 * @param note subtitle to rewrite
 * @returns rewritten title
 */
export async function generateCalendarTitleReplacement(
    name: string,
    note: string = "",
): Promise<string> {
    const text = name.toUpperCase() + note.toUpperCase();

    //console.log("Generating title appendix for:", text);

    const knownKeywords = [
        "Abendmahl",
        "Familien",
        "Grünen",
        "Konfirmation",
        "Ökum",
    ];

    let result = "";

    // 1. Check simple keywords (order matters)
    for (const keyword of knownKeywords) {
        if (text.includes(keyword.toUpperCase())) {
            result = keyword;
            break;
        }
    }

    // 2. If none matched, check "specials"
    if (!result) {
        const knownSpecials: Record<string, string> = {
            Sankenbach: "Grünen",
            Flößerplatz: "Grünen",
            Gartenschau: "Grünen",
            Schelkewiese: "Grünen",
            Wohnzimmer: "Wohnzimmer",
            CVJM: "CVJM",
            Impuls: "Impuls",
        };

        for (const [keyword, replacement] of Object.entries(knownSpecials)) {
            if (text.includes(keyword.toUpperCase())) {
                result = replacement;
                break;
            }
        }
    }

    // 3. Final replacements for full text postfix
    const fulltextReplacements: Record<string, string> = {
        Abendmahl: "mit Abendmahl",
        Familien: "für Familien",
        Grünen: "im Grünen",
        Wohnzimmer: "Wohnzimmer-Worship",
        Ökum: "Ökumenisch",
    };

    if (fulltextReplacements[result]) {
        result = fulltextReplacements[result];
    }

    return result;
}
