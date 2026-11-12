

async function getRowByExport() {

    let url = `https://api.hubapi.com/cms/hubdb/2026-03/tables/1246109892/rows`;


    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Update error ${response.status}: ${err}`);
    }

    return await response.json();
}

const getNames = (items = []) => items.map(item => item.name).filter(Boolean);

const strip = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

function scoreCourse(course, searchText) {
    const q = norm(searchText);
    const title = norm(course.title);
    const words = q.split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 2);
    if (!words.length) return 0;

    let score = 0;
    if (title === q) score += 1000;                       // exact title
    else if (title.includes(q) || q.includes(title)) score += 500;

    const meta = norm([...course.course_tag, ...course.more, ...course.branchName,
    ...course.authors, course.businessUnit, course.level, course.format].join(" "));
    const rest = norm([strip(course.description), course.detailsLink,
    ...course.nextIntake, ...course.detailsTabList].join(" "));

    for (const w of words) {
        if (title.includes(w)) score += 10;
        if (meta.includes(w)) score += 3;
        if (rest.includes(w)) score += 1;
    }
    return score;
}

async function getNextIntakeData(searchText = "") {
    try {
        const data = await getRowByExport();

        const result = [];
        const all = [];

        for (const row of data.results) {

            const nextIntake = (row.values.next_intake || []).map(x => x.name);
            const detailsTabList = (row.values.details_tab_list || []).map(x => x.name);
            const authors = (row.values.author || []).map(x => x.name);

            const course = {
                rowId: row.id,
                url: `https://145914055.hs-sites-eu1.com/all-courses/${row.path}`,
                course_tag: getNames(row.values.course_tag),
                level: row.values.level?.label ?? null,
                format: row.values.course_format?.label ?? null,
                subsidy: row.values.subsidy?.label ?? null,
                more: getNames(row.values.more),
                branchName: getNames(row.values.branch_name),

                video: row.values.video?.url ?? null,
                image: row.values.courses_image?.url ?? null,
                wantOverlayImage: row.values.want_overlay_image ?? null,
                overlayImage: row.values.overlay_image?.url ?? null,
                title: row.name,
                description: row.values.content,
                detailsLink: row.path,
                currency_symbol: row.values.currency_symbols?.name ?? null,
                price: row.values.price ?? null,
                priceSectionSubTitle: row.values.course_details_price_info ?? null,
                date: row.values.start_date
                    ? new Date(row.values.start_date).toISOString()
                    : null,
                timeHours: row.values.time ?? null,
                registerUrl: row.values.register_url ?? null,
                showCourseDetailsButtons: row.values.course_details_pop_dailog ?? null,
                businessUnit: row.values.business_unit?.label ?? null,

                nextIntake,
                detailsTabList,
                authors
            };

            all.push(course);
            const score = scoreCourse(course, searchText);
            if (score > 0) scored.push({ course, score });
        }

        scored.sort((a, b) => b.score - a.score);

        if (scored.length && scored[0].score >= 500) return [scored[0].course];
        const top = scored.slice(0, 3).map(s => s.course);
        return top.length ? top : all.slice(0, 20);

    } catch (error) {
        console.error(error);
        return [];
    }
}

module.exports = {
    getNextIntakeData
};