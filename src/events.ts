import { churchtoolsClient } from "@churchtools/churchtools-client";
import type { Event } from "./utils/ct-types";

/**
 * fetch list of next events using specified params
 * @param limit
 * @returns list of events applicable to filter including eventServices
 */
async function getNextEvents(
    calendarIds: number[] = [],
    limit: number = 5,
): Promise<Event[]> {
    const events = await churchtoolsClient.get<Event[]>(
        `/events?include=eventServices`,
    );
    /*console.log(
        "Fetched events from CT:",
        //events[0].calendar!.domainIdentifier,
        //calendarIds.includes(Number(events[0].calendar!.domainIdentifier)),
    );*/
    let filteredEvents: Event[] = events.filter((event) => {
        // Filter by calendar IDs if provided
        if (
            calendarIds.length > 0 &&
            calendarIds.includes(Number(event.calendar!.domainIdentifier))
        ) {
            return true;
        }
    });

    let limitedEvents: Event[] = filteredEvents.slice(0, limit);

    console.log(
        `Got next ${limitedEvents.length} events`, //, limitedEvents
    );
    return limitedEvents;
}
