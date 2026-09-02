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

/** Render the selected calendar appointments in the appointment list. */
export function renderCalendarAppointments(
    calendarAppointments: AppointmentCalculatedWithIncludes[][],
    document: Document,
): void {
    const appointments = calendarAppointments
        .flat()
        .sort(
            (first, second) =>
                new Date(first.appointment.calculated.startDate).getTime() -
                new Date(second.appointment.calculated.startDate).getTime(),
        );
    const appointmentListWrapper = document.querySelector<HTMLDivElement>(
        "#appointmentListWrapper",
    );

    if (!appointmentListWrapper) {
        return;
    }

    appointmentListWrapper.replaceChildren();
    const appointmentList = document.createElement("div");
    appointmentList.className = "appointment-list";

    for (const appointment of appointments) {
        const appointmentElement = document.createElement("article");
        appointmentElement.className = "appointment-list_item";
        appointmentElement.style.setProperty(
            "--appointment-color",
            appointment.appointment.base.calendar.color,
        );

        const image = appointment.appointment.base.image;
        const appointmentContent = document.createElement("div");
        appointmentContent.className = "appointment-list_content";

        if (image?.imageUrl || image?.fileUrl) {
            const imageElement = document.createElement("img");
            imageElement.className = "appointment-list_image";
            imageElement.src = image.imageUrl || image.fileUrl;
            imageElement.alt = appointment.appointment.base.title;
            imageElement.loading = "lazy";
            appointmentElement.classList.add(
                "appointment-list_item_with-image",
            );
            appointmentElement.append(imageElement, appointmentContent);
        }

        const startDate = document.createElement("time");
        startDate.className = "appointment-list_date";
        startDate.dateTime = appointment.appointment.calculated.startDate;
        startDate.textContent = new Date(
            appointment.appointment.calculated.startDate,
        ).toLocaleString("de-DE", {
            dateStyle: "medium",
            timeStyle: "short",
        });

        const title = document.createElement("h2");
        title.className = "appointment-list_title";
        title.textContent = appointment.appointment.base.title;

        appointmentContent.append(startDate, title);

        if (appointment.appointment.base.subtitle) {
            const subtitle = document.createElement("p");
            subtitle.className = "appointment-list_subtitle";
            subtitle.textContent = appointment.appointment.base.subtitle;
            appointmentContent.appendChild(subtitle);
        }

        if (!image?.imageUrl && !image?.fileUrl) {
            appointmentElement.appendChild(appointmentContent);
        }

        appointmentList.appendChild(appointmentElement);
    }

    appointmentListWrapper.appendChild(appointmentList);
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
