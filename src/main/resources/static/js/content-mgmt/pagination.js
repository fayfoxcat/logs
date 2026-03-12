/**
 * 【内容管理区】分页控件模块
 */
window.LogViewerPagination = (function() {
    'use strict';

    let currentPage = 1;
    let totalPages = 1;
    const LINES_PER_PAGE = 1000;
    let isAutoRefreshEnabled = false;

    function setAutoRefreshEnabled(enabled) {
        isAutoRefreshEnabled = enabled;
    }

    function updatePagination(totalLines) {
        totalPages = Math.max(1, Math.ceil(totalLines / LINES_PER_PAGE));

        if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        $("#total-lines").text(totalLines);
        $("#page-total-count").text(totalPages);
        $("#page-jump-input").val(currentPage);
        $("#page-jump-input").attr("max", totalPages);

        if (totalLines > LINES_PER_PAGE) {
            $("#pagination-controls").show();
        } else {
            $("#pagination-controls").hide();
        }

        if (isAutoRefreshEnabled) {
            $("#page-first-btn, #page-prev-btn, #page-next-btn, #page-last-btn").prop("disabled", true);
        } else {
            $("#page-first-btn, #page-prev-btn").prop("disabled", currentPage <= 1);
            $("#page-last-btn, #page-next-btn").prop("disabled", currentPage >= totalPages);
        }
    }

    function goToPage(page) {
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        currentPage = page;
        return currentPage;
    }

    function getCurrentPage() {
        return currentPage;
    }

    function getTotalPages() {
        return totalPages;
    }

    function reset() {
        currentPage = 1;
        totalPages = 1;
        isAutoRefreshEnabled = false;
    }

    function setCurrentPage(page) {
        currentPage = page;
    }

    return {
        updatePagination,
        goToPage,
        getCurrentPage,
        getTotalPages,
        reset,
        setCurrentPage,
        setAutoRefreshEnabled,
        LINES_PER_PAGE
    };
})();
