/**
 * UI状态管理模块
 */
window.LogViewerUIState = (function() {
    'use strict';

    function setEmptyHintVisible(visible) {
        if (visible) {
            $("#log-content-empty").show();
            $("#log-content-actual").hide().empty();
        } else {
            $("#log-content-empty").hide();
            $("#log-content-actual").show();
        }
    }

    function setActiveFileName(name) {
        const $pathValue = $("#current-file-path");
        if (name && name !== "未选择文件" && name !== null) {
            $pathValue.text(name).removeClass("placeholder");
        } else {
            $pathValue.text("请选择日志文件").addClass("placeholder");
        }
    }

    function updateDownloadButton(selectedIds) {
        $("#download-btn").prop("disabled", selectedIds.size === 0);
        const badge = $("#selected-count");
        if (selectedIds.size > 0) {
            badge.text(String(selectedIds.size)).show();
        } else {
            badge.hide();
        }
    }

    function openSearchPanel() {
        $("#main-row").removeClass("right-collapsed");
    }

    function closeSearchPanel() {
        $("#main-row").addClass("right-collapsed");
    }

    function toggleSidebar() {
        const main = $("#main-row");
        const toggleBtn = $("#toggle-sidebar");
        if (main.hasClass("left-collapsed")) {
            main.removeClass("left-collapsed");
            toggleBtn.text("◀");
        } else {
            main.addClass("left-collapsed");
            toggleBtn.text("▶");
        }
    }

    return {
        setEmptyHintVisible,
        setActiveFileName,
        updateDownloadButton,
        openSearchPanel,
        closeSearchPanel,
        toggleSidebar
    };
})();
