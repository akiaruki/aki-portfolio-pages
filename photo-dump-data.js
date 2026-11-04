/*
 * Public Photo dump entries, kept independent of portfolio posts and journal.
 * The future Portfolio app may add entries in this form:
 * { id: 'unique-id', src: 'photo-dump-media/file-name.jpg',
 *   addedAt: '2026-11-04T09:30:00Z', alt: 'Optional description' }
 * addedAt is an ISO 8601 UTC timestamp; newer timestamps appear first.
 * Image files and this list are public. A file appears here only when uploaded
 * specifically to Photo dump. Equal timestamps retain the order in this list.
 */
window.AKI_PHOTO_DUMP = [];
