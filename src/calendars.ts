import { churchtoolsClient } from "@churchtools/churchtools-client";
import type {
    AppointmentBase,
    AppointmentCalculatedWithIncludes,
} from "./utils/ct-types";

/** Render the selected calendar appointments in the appointment list. */
export function renderCalendarAppointments(
    calendarAppointments: AppointmentCalculatedWithIncludes[][],
    document: Document,
    resourceNamesByAppointment: Map<number, string[]> = new Map(),
    createPost?: (
        appointment: AppointmentCalculatedWithIncludes,
    ) => Promise<void>,
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

        const resourceNames =
            resourceNamesByAppointment.get(appointment.appointment.base.id) ??
            [];
        if (resourceNames.length > 0) {
            const resourceList = document.createElement("p");
            resourceList.className = "appointment-list_resources";
            resourceList.textContent = `Ort: ${resourceNames.join(", ")}`;
            appointmentContent.appendChild(resourceList);
        }

        if (createPost) {
            const postButton = document.createElement("button");
            postButton.type = "button";
            postButton.className =
                "appointment-list_post-button c-button c-button__S c-button__primary " +
                "rounded-sm text-body-m-emphasized gap-2 justify-center px-4 py-2 " +
                "text-white bg-blue-bright";
            postButton.textContent = "Post erstellen";
            postButton.addEventListener("click", async () => {
                postButton.disabled = true;
                postButton.textContent = "Wird erstellt...";
                try {
                    await createPost(appointment);
                    postButton.textContent = "Erstellt";
                } catch (error) {
                    console.error("Could not create post:", error);
                    postButton.disabled = false;
                    postButton.textContent = "Post erstellen";
                }
            });
            appointmentContent.appendChild(postButton);
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
