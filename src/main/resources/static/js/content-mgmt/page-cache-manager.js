/**
 * 【内容管理区】页面缓存管理器
 */
window.LogViewerPageCache = (function() {
    'use strict';

    const CONFIG = {
        MAX_CACHE_PAGES: 10,
        PRELOAD_RANGE: 1,
        PRELOAD_DELAY: 500,
        CHECK_INTERVAL: 3000
    };

    let cache = {
        fileId: null,
        fileVersion: null,
        metadata: null,
        pages: new Map(),
        currentPage: 1,
        mode: 'auto'
    };

    let preloadTimer = null;
    let checkTimer = null;
    let abortControllers = new Map();

    function init(fileId, metadata) {
        cache.fileId = fileId;
        cache.fileVersion = metadata.fileVersion;
        cache.metadata = metadata;
        cache.pages.clear();
        cache.currentPage = 1;
        cache.mode = 'auto';
        
        if (!metadata.isZipEntry) {
            startFileChangeDetection();
        }
    }

    async function getPage(page) {
        if (cache.pages.has(page)) {
            const cached = cache.pages.get(page);
            if (cached.valid) {
                return cached.data;
            }
        }
        const data = await loadPageFromServer(page);
        putCache(page, data);
        return data;
    }

    async function loadPageFromServer(page) {
        if (abortControllers.has(page)) {
            abortControllers.get(page).abort();
        }

        const controller = new AbortController();
        abortControllers.set(page, controller);

        try {
            const response = await fetch(
                `${window.LogViewerUtils.getEndpoint()}/file/content/page?` +
                `file=${encodeURIComponent(cache.fileId)}&page=${page}&pageSize=1000`,
                { signal: controller.signal }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (result.fileVersion !== cache.fileVersion) {
                handleFileChange(result.fileVersion);
            }

            abortControllers.delete(page);
            return result;
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error(`[Cache] Load error: page ${page}`, error);
            }
            throw error;
        }
    }

    function putCache(page, data) {
        if (cache.pages.size >= CONFIG.MAX_CACHE_PAGES) {
            let farthest = null;
            let maxDistance = 0;
            
            cache.pages.forEach((value, key) => {
                const distance = Math.abs(key - cache.currentPage);
                if (distance > maxDistance) {
                    maxDistance = distance;
                    farthest = key;
                }
            });
            
            if (farthest !== null) {
                cache.pages.delete(farthest);
            }
        }

        cache.pages.set(page, {
            data: data,
            valid: true,
            loadTime: Date.now()
        });
    }

    function setCurrentPage(page) {
        cache.currentPage = page;
        updateMode();
        
        if (preloadTimer) {
            clearTimeout(preloadTimer);
        }
        
        preloadTimer = setTimeout(() => {
            preloadAdjacentPages(page);
        }, CONFIG.PRELOAD_DELAY);
    }

    async function preloadAdjacentPages(currentPage) {
        const totalPages = cache.metadata.totalPages;
        const range = CONFIG.PRELOAD_RANGE;
        
        const pagesToLoad = [];
        for (let i = currentPage - range; i <= currentPage + range; i++) {
            if (i > 0 && i <= totalPages && i !== currentPage) {
                if (!cache.pages.has(i) || !cache.pages.get(i).valid) {
                    pagesToLoad.push(i);
                }
            }
        }

        pagesToLoad.sort((a, b) => {
            return Math.abs(a - currentPage) - Math.abs(b - currentPage);
        });

        for (const page of pagesToLoad) {
            try {
                await getPage(page);
            } catch (error) {
                // 忽略预加载错误
            }
        }
    }

    function updateMode() {
        const totalPages = cache.metadata.totalPages;
        const currentPage = cache.currentPage;
        
        if (currentPage >= totalPages - 1) {
            cache.mode = 'realtime';
        } else {
            cache.mode = 'history';
        }
    }

    function startFileChangeDetection() {
        if (checkTimer) {
            clearInterval(checkTimer);
        }

        if (cache.metadata && cache.metadata.isZipEntry) {
            return;
        }

        checkTimer = setInterval(async () => {
            try {
                await checkFileChange();
            } catch (error) {
                console.error('[Cache] File change check error:', error);
            }
        }, CONFIG.CHECK_INTERVAL);
    }

    function stopFileChangeDetection() {
        if (checkTimer) {
            clearInterval(checkTimer);
            checkTimer = null;
        }
    }

    async function checkFileChange() {
        if (!cache.fileId || !cache.fileVersion) {
            return;
        }

        try {
            const response = await fetch(
                `${window.LogViewerUtils.getEndpoint()}/file/metadata?` +
                `file=${encodeURIComponent(cache.fileId)}`
            );

            if (!response.ok) {
                return;
            }

            const metadata = await response.json();
            
            if (metadata.fileVersion !== cache.fileVersion) {
                handleFileChange(metadata.fileVersion, metadata);
            }
            
        } catch (error) {
            console.error('[Cache] Check file change error:', error);
        }
    }

    function handleFileChange(newVersion, newMetadata) {
        const oldMetadata = cache.metadata;
        const isAppend = isAppendOnly(oldMetadata, newMetadata || {});
        
        if (isAppend) {
            handleAppend(newMetadata);
        } else {
            handleModification(newMetadata);
        }
    }

    function isAppendOnly(oldMeta, newMeta) {
        if (!oldMeta || !newMeta) return false;
        
        return newMeta.fileSize > oldMeta.fileSize &&
               newMeta.totalLines > oldMeta.totalLines &&
               newMeta.lastModified > oldMeta.lastModified;
    }

    function handleAppend(newMetadata) {
        const oldTotalPages = cache.metadata.totalPages;
        const newTotalPages = newMetadata.totalPages;
        const newLines = newMetadata.totalLines - cache.metadata.totalLines;
        
        cache.metadata = newMetadata;
        cache.fileVersion = newMetadata.fileVersion;
        
        for (let page = oldTotalPages - 1; page <= newTotalPages; page++) {
            if (cache.pages.has(page)) {
                cache.pages.get(page).valid = false;
            }
        }
        
        if (window.LogViewerApp && window.LogViewerApp.onFileAppend) {
            window.LogViewerApp.onFileAppend({
                oldTotalPages,
                newTotalPages,
                newLines
            });
        }
        
        if (cache.currentPage >= oldTotalPages - 1) {
            if (window.LogViewerApp && window.LogViewerApp.refreshCurrentPage) {
                window.LogViewerApp.refreshCurrentPage();
            }
        }
    }

    function handleModification(newMetadata) {
        cache.pages.clear();
        
        if (newMetadata) {
            cache.metadata = newMetadata;
            cache.fileVersion = newMetadata.fileVersion;
        }
        
        if (window.LogViewerApp && window.LogViewerApp.onFileModified) {
            window.LogViewerApp.onFileModified({
                message: '文件已被修改，正在重新加载...'
            });
        }
    }

    function clear() {
        cache.pages.clear();
        cache.fileId = null;
        cache.fileVersion = null;
        cache.metadata = null;
        cache.currentPage = 1;
        
        abortControllers.forEach(controller => controller.abort());
        abortControllers.clear();
        
        stopFileChangeDetection();
    }

    function getStatus() {
        return {
            fileId: cache.fileId,
            fileVersion: cache.fileVersion,
            currentPage: cache.currentPage,
            cachedPages: Array.from(cache.pages.keys()),
            mode: cache.mode,
            metadata: cache.metadata
        };
    }

    return {
        init,
        getPage,
        setCurrentPage,
        clear,
        getStatus,
        startFileChangeDetection,
        stopFileChangeDetection
    };
})();
