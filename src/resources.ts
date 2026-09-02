import { churchtoolsClient } from "@churchtools/churchtools-client";
import type { BookingCalculatedWithIncludes, Resource } from "./utils/ct-types";

let availableResourcesCache: Resource[] | undefined;

/** Retrieve available resources and populate the resource filter. */
export async function refreshAvailableResources(
    selectedResources?: number[],
): Promise<Resource[]> {
    const availableResources =
        await churchtoolsClient.get<Resource[]>("/resources");
    availableResourcesCache = availableResources;
    const selectEl = document.getElementById(
        "selectedResources",
    ) as HTMLSelectElement | null;

    if (!selectEl) {
        return availableResources;
    }

    selectEl.replaceChildren();
    const resourceSelection =
        selectedResources ?? availableResources.map((resource) => resource.id);

    for (const resource of availableResources) {
        const option = document.createElement("option");
        option.value = resource.id.toString();
        option.textContent =
            resource.nameTranslated || resource.name || resource.id.toString();
        option.selected = resourceSelection.includes(resource.id);
        selectEl.appendChild(option);
    }

    return availableResources;
}

/** Retrieve resource names grouped by their calendar appointment. */
export async function getResourceNamesByAppointment(
    fromDate: Date,
    toDate: Date,
    selectedResources?: number[],
): Promise<Map<number, string[]>> {
    const availableResources =
        availableResourcesCache ??
        (await churchtoolsClient.get<Resource[]>("/resources"));
    availableResourcesCache = availableResources;
    const resourceIds =
        selectedResources ?? availableResources.map((resource) => resource.id);
    if (resourceIds.length === 0) {
        return new Map();
    }

    const bookings = await churchtoolsClient.get<
        BookingCalculatedWithIncludes[]
    >(
        `/bookings?resource_ids[]=${resourceIds.join(
            "&resource_ids[]=",
        )}&from=${fromDate.toLocaleDateString(
            "en-ca",
        )}&to=${toDate.toLocaleDateString("en-ca")}`,
    );
    const resourceNamesByAppointment = new Map<number, string[]>();

    for (const booking of bookings) {
        const appointmentId = booking.booking.base.appointmentId;
        if (appointmentId === null) {
            continue;
        }

        const selected =
            booking.booking.base.resource ??
            availableResources.find(
                (resource) => resource.id === booking.booking.base.resourceId,
            );
        const resourceName = selected?.nameTranslated || selected?.name;
        if (!resourceName) {
            continue;
        }

        const resourceNames =
            resourceNamesByAppointment.get(appointmentId) ?? [];
        if (!resourceNames.includes(resourceName)) {
            resourceNames.push(resourceName);
        }
        resourceNamesByAppointment.set(appointmentId, resourceNames);
    }

    return resourceNamesByAppointment;
}
