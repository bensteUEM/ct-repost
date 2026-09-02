/** Persisting values with KV-store usage **/

import { churchtoolsClient } from "@churchtools/churchtools-client";
import type { CustomModuleDataCategory, Person } from "./utils/ct-types";
import {
    createCustomDataCategory,
    createCustomDataValue,
    getCustomDataCategories,
    getCustomDataCategory,
    getCustomDataValues,
    getModule,
    updateCustomDataValue,
} from "./utils/kv-store";

/* Custom FilterData definition */
export interface FilterValueData {
    userId: string | number;
    selected: {
        calendars: number[];
        postGroup?: string;
        resources?: number[];
        days: number;
    };
}

/** Reset stored categories for all users if they don't exist
 * @return {Promise<boolean>} - true if reset was finished
 */
export async function resetStoredCategories(): Promise<boolean> {
    const categories = await getCustomDataCategories();
    const filtersExist = categories.some(
        (item: CustomModuleDataCategory) => item.name === "filters",
    );

    if (filtersExist) {
        console.log("Filters category exists:", filtersExist);
        return true; // nothing to do
    }

    const dataSchema = JSON.stringify({
        type: "object",
        properties: {
            userId: { type: ["string", "number"] },
            selected: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        calendars: { type: "array", items: { type: "number" } },
                        postGroup: { type: "string" },
                        resources: { type: "array", items: { type: "number" } },
                        days: { type: "number" },
                    },
                    required: ["calendars", "days"],
                },
            },
        },
        required: ["userId", "selected"],
    });

    await createCustomDataCategory({
        customModuleId: (await getModule()).id,
        name: "filters",
        shorty: "filters",
        description: "Stores filter selections for users",
        data: dataSchema,
    })
        .then((category) => {
            console.log("Created category:", category);
        })
        .catch((err) => console.error(err));

    return true;
}

/* Store filter selections for a user */
export async function setFilters(
    selected: {
        calendars: number[];
        postGroup?: string;
        resources?: number[];
        days: number;
    },
    userId?: number,
) {
    if (!userId) {
        const user = await churchtoolsClient.get<Person>(`/whoami`);
        userId = user.id;
    }

    const categoryName = "filters";
    const category = await getCustomDataCategory<FilterValueData>(categoryName);
    if (category === undefined) {
        await resetStoredCategories();
        console.log("Category 'filters' not found. Creating it now.");
    }
    const categoryId = category?.id ?? 0;

    await createCustomDataValue({
        dataCategoryId: categoryId,
        value: JSON.stringify({
            userId: userId,
            selected: selected,
        }),
    });

    console.log("Storing filters for user:", userId, selected);
}

/* Update filter selections for users with existing filter */
export async function updateFilters(
    selected: {
        calendars: number[];
        postGroup?: string;
        resources?: number[];
        days: number;
    },
    userId?: number,
) {
    if (!userId) {
        const user = await churchtoolsClient.get<{ id: number }>(`/whoami`);
        userId = user.id;
    }

    const category = await getCustomDataCategory<FilterValueData>("filters");
    if (!category) {
        await resetStoredCategories();
        console.log("Category 'filters' not found. Creating it now.");
    }

    const categoryId = category?.id ?? 0;

    // Fetch existing values
    const values = await getCustomDataValues<FilterValueData>(categoryId);
    const existing = values.find((v) => v.userId === userId);

    if (existing) {
        // Update the existing value
        await updateCustomDataValue(categoryId, existing.id, {
            value: JSON.stringify({
                userId,
                selected,
            }),
        });
        console.log("Updated filters for user:", userId, selected);
    } else {
        // Create new value if none exists
        await createCustomDataValue({
            dataCategoryId: categoryId,

            value: JSON.stringify({
                userId,
                selected,
            }),
        });
        console.log("Created filters for user:", userId, selected);
    }
}

/* Retrieve filter selections for a user */
export async function getFilters(userId?: number): Promise<{
    calendars: number[];
    postGroup?: string;
    resources?: number[];
    days: number;
} | null> {
    if (!userId) {
        const user = await churchtoolsClient.get<{ id: number }>(`/whoami`);
        userId = user.id;
    }

    const category = await getCustomDataCategory<FilterValueData>("filters");
    if (!category) return null;

    const values = await getCustomDataValues<FilterValueData>(category.id);

    const userValue = values.find((v) => {
        return v.userId === userId;
    });

    if (!userValue) {
        console.log("no saved filters available for user", userId);
        return null;
    }

    return userValue.selected;
}
