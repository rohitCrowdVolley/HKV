const HUBDB_TABLE_ID = "1246109892";
const HUBDB_INTAKE_TABLE_ID = "2379830480";


async function getAllRow(hubdbTableId = HUBDB_TABLE_ID, param = { active: true, outdated: null }) {
    let allRows = [];
    let after = null;

    do {
        const params = new URLSearchParams({ limit: "100" });
        if (param.active == true) {
            params.set("active", param.active);
        }
        if (param.outdated == false) {
            params.set("outdated", param.outdated);
        }

        if (after) { params.set("after", after); }

        const response = await fetch(`https://api.hubapi.com/cms/hubdb/2026-03/tables/${hubdbTableId}/rows?${params}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(
                `HubDB fetch error ${response.status}: ${err}`
            );
        }

        const data = await response.json();

        allRows.push(...(data.results || []));

        after = data.paging?.next?.after || null;

    } while (after);

    console.log("Total HubDB rows fetched:", allRows.length);

    return allRows;
}

async function getRowById(rowId) {

    const response = await fetch(
        `https://api.hubapi.com/cms/hubdb/2026-03/tables/${HUBDB_INTAKE_TABLE_ID}/rows/${rowId}`,
        {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch row ${rowId}`);
    }

    return await response.json();
}

const getNames = (items = []) => items.map(item => item.name).filter(Boolean);

function formatTimestamp(timestamp, includeTime = false) {
    if (!timestamp) return '';

    const date = new Date(Number(timestamp));
    if (isNaN(date.getTime())) return '';

    return includeTime ? date.toISOString() : date.toISOString().split('T')[0];
}

async function getDurchfuhrungenData() {
    try {
        const data = await getAllRow(HUBDB_INTAKE_TABLE_ID, { active: false, outdated: false });
        const result = [];

        for (const row of data) {

            result.push({
                id: row.id,
                standort: row.values.name ?? null,
                uuid: row.values.uuid ?? null,
                pk: row.values.pk ?? null,
                price: row.values.price ?? null,
                start_date: formatTimestamp(row.values.start_date) ?? null,
                location: row.values.name ?? null,
                seats: row.values.event_open ?? null,
                duration: row.values.duration ?? null,
                register_url: row.values.register_url ?? null,
                notification: row.values.notification.label ?? null,
                bezeichnung: row.values.label ?? null,
                kurzbezeichnung: row.values.abbreviation ?? null,
                zeiten: row.values.times ?? null,
                ende: formatTimestamp(row.values.last_course_date) ?? null,
                publication_internet_from: formatTimestamp(row.values.publication_internet_from, true) ?? null,
                publication_internet_till: formatTimestamp(row.values.publication_internet_till, true) ?? null,
                registration_internet_from: formatTimestamp(row.values.registration_internet_from, true) ?? null,
                registration_internet_till: formatTimestamp(row.values.registration_internet_till, true) ?? null,
                participation_min: row.values.participation_min ?? 0,
                lehrmethode: row.values.relevent_teaching_method_unique_id ?? null,
                orange_light: row.values.orange_light ?? null,
                execution_guaranteed: row.values.execution_guaranteed == 1,
                relreservation_date_from: formatTimestamp(row.values.relreservation_date_from, true) ?? null,
                relreservation_date_till: formatTimestamp(row.values.relreservation_date_till, true) ?? null,
                registration: row.values.registration ?? 0,
                typ: row.values.relevent_type_label ?? null,
                teaching_method_label: row.values.relevent_teaching_method_label ?? null

            });
        }

        return result;

    } catch (error) {
        console.error(error);
    }
}



async function getNextIntakeData() {
    try {
        const data = await getAllRow();
        const dataWithIntakeInformation = await getDurchfuhrungenData();

        const result = [];
        const all = [];

        for (const row of data) {
            let nextIntake = (row.values.next_intake || []).map(x => x.id);
            let informationalEvents = (row.values.informationalEvents || []).map(x => x.id);
            const intakeInformation = dataWithIntakeInformation.filter(intake => nextIntake.includes(intake.id));
            const intakeInformationData = dataWithIntakeInformation.filter(event => informationalEvents.includes(event.id));
            // let intakeInformation = [];
            // let intakeInformationData = [];

            // for (const id of nextIntake) {
            //     const intakeRow = await getDurchfuhrungenData(id);

            //     if (intakeRow) {
            //         intakeInformation.push(intakeRow);
            //     }
            // }

            // // Fetch Informational Events rows sequentially
            // for (const id of informationalEvents) {
            //     const eventRow = await getDurchfuhrungenData(id);

            //     if (eventRow) {
            //         intakeInformationData.push(eventRow);
            //     }
            // }

            const course = {
                rowId: row.id,
                title: row.values?.title,
                url: `https://www.hkv.ch/${row.values?.course_details}`,
                active: row.values?.active == 1 ?? false,
                businessUnit: getNames(row.values?.business_unit),
                course_tag: getNames(row.values?.course_tag),
                kursformat: getNames(row.values?.course_format),
                subsidy: row.values?.subsidy?.label ?? null,
                categories: getNames(row.values.more),
                branchName: getNames(row.values.branch_name),
                courses_image: row.values.courses_image?.url ?? null,
                description: row.values.content,
                detailsLink: row.values?.course_details,
                price: row.values.price ?? null,
                start_date: row.values.start_date
                    ? new Date(row.values.start_date).toISOString()
                    : null,

                nextIntake,
                informationalEvents,
                intakeInformation,
                intakeInformationData
            };

            all.push(course);
        }

        console.log(all[11]);

        return all;

    } catch (error) {
        console.error(error);
        return [];
    }
}

module.exports = {
    getNextIntakeData
};