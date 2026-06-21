export default function getVisiblePages(currentPage, totalPages) {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set([1, totalPages, currentPage]);
    for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
        if (page > 1 && page < totalPages) {
            pages.add(page);
        }
    }

    const sortedPages = [...pages].sort((a, b) => a - b);
    const visiblePages = [];

    sortedPages.forEach((page, index) => {
        if (index > 0 && page - sortedPages[index - 1] > 1) {
            visiblePages.push('ellipsis');
        }
        visiblePages.push(page);
    });

    return visiblePages;
}
