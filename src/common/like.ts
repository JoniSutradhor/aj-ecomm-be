/** Escapes % and _ so user input is matched literally inside ILIKE ... ESCAPE '\'. */
export const escapeLike = (value: string): string =>
    value.replace(/[\\%_]/g, '\\$&');
