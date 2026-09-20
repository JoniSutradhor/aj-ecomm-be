import { Repository } from 'typeorm';

export const slugify = (value: string): string =>
    value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'item';

/** Returns the slug of `name`, or `slug-2`, `slug-3`... when it is already taken. */
export const uniqueSlug = async (
    repo: Repository<{ id: number; slug: string }>,
    name: string,
    excludeId?: number
): Promise<string> => {
    const base = slugify(name);
    let slug = base;
    for (let i = 2; ; i++) {
        const existing = await repo.findOne({ where: { slug } });
        if (!existing || existing.id === excludeId) return slug;
        slug = `${base}-${i}`;
    }
};
