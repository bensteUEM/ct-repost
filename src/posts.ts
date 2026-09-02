import { churchtoolsClient } from "@churchtools/churchtools-client";
import type {
    AppointmentCalculatedWithIncludes,
    PostCreate,
    PostVisibility,
} from "./utils/ct-types";

/** Create a ChurchTools post from a calendar appointment. */
export async function createPostFromAppointment(
    appointment: AppointmentCalculatedWithIncludes,
    selectedPostGroup: string,
    resourceNamesByAppointment: Map<number, string[]>,
    visibility: PostVisibility = "group_visible",
    skipDraft = true,
): Promise<void> {
    const groupIdMatch = selectedPostGroup.match(/(\d+)$/);
    const groupId = groupIdMatch
        ? Number(groupIdMatch[1])
        : Number(selectedPostGroup);
    if (!Number.isInteger(groupId) || groupId <= 0) {
        throw new Error("No valid post group is selected.");
    }

    const startDate = new Date(appointment.appointment.calculated.startDate);
    const endDate = new Date(appointment.appointment.calculated.endDate);
    const resourceNames =
        resourceNamesByAppointment.get(appointment.appointment.base.id) ?? [];
    const dateTime = `**Von:** ${startDate.toLocaleString("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
    })}  
**Bis:** ${endDate.toLocaleString("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
    })}\n\n`;
    const contentParts = [
        appointment.appointment.base.subtitle ?? "",
        dateTime,
        resourceNames.length > 0 ? `Ort: ${resourceNames.join(", ")}` : "",
        appointment.appointment.base.description?.replace(/\r?\n/g, "  \n") ??
            "",
    ].filter(Boolean);
    const post: PostCreate = {
        title: appointment.appointment.base.title,
        content: contentParts.join("  \n"),
        visibility,
        groupId,
        ...(appointment.appointment.base.image
            ? { imageIds: [appointment.appointment.base.image.id] }
            : {}),
        draft: !skipDraft, //TODO https://github.com/bensteUEM/ct-repost/issues/13
    };

    await churchtoolsClient.post("/posts", post);
}
