/**
 * 【目录区】文件操作模块
 */
window.LogViewerFileOperations = (function() {
    'use strict';

    let apiBase = '';

    function loadFsFile(filePath, onSuccess, onError) {
        $.get(apiBase + "/file/content", { filePath: filePath }, function (data) {
            const lines = String(data || "").split("\n");
            if (onSuccess) onSuccess(lines, filePath);
        }).fail(function () {
            if (onError) onError("加载文件失败");
        });
    }

    function loadZipEntry(zipPath, entryName, onSuccess, onError) {
        $.get(apiBase + "/zip/file/content", { zipPath: zipPath, entryName: entryName }, function (data) {
            const lines = String(data || "").split("\n");
            const activeId = zipPath + "!" + entryName;
            if (onSuccess) onSuccess(lines, activeId);
        }).fail(function () {
            if (onError) onError("加载文件失败");
        });
    }

    function searchFiles(rootPath, keyword, onSuccess, onError) {
        $.get(apiBase + "/files/search", { rootPath: rootPath, keyword: keyword }, function (data) {
            if (onSuccess) onSuccess(data);
        }).fail(function () {
            if (onError) onError("搜索失败");
        });
    }

    function downloadSelectedFiles(selectedIds, apiBasePath) {
        if (selectedIds.size === 0) return;
        const form = $(`<form action="${apiBasePath}/download" method="post"></form>`);
        Array.from(selectedIds).forEach(function (id) {
            form.append(`<input type="hidden" name="files" value="${window.LogViewerUtils.escapeHtml(id)}"/>`);
        });
        $("body").append(form);
        form.submit();
        form.remove();
    }

    function init(apiBasePath) {
        apiBase = apiBasePath;
    }

    return {
        init,
        loadFsFile,
        loadZipEntry,
        searchFiles,
        downloadSelectedFiles
    };
})();
