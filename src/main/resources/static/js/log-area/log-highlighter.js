/**
 * 【日志区】日志语法高亮器
 */
(function() {
    'use strict';
    
    let HIGHLIGHT_RULES = [];
    let patternsLoaded = false;

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async function loadPatterns() {
        if (patternsLoaded) return;

        try {
            const endpoint = window.logViewerEndpoint || '/logs';
            const response = await fetch(`${endpoint}/patterns`);
            const data = await response.json();

            if (data && data.patterns) {
                HIGHLIGHT_RULES = [];
                Object.entries(data.patterns).forEach(([key, rule]) => {
                    if (rule.highlight) {
                        try {
                            const pattern = new RegExp(rule.regex, 'g');
                            HIGHLIGHT_RULES.push({
                                pattern: pattern,
                                className: rule.className || `log-${key}`
                            });
                        } catch (e) {
                            console.warn(`Invalid regex for pattern ${key}:`, e);
                        }
                    }
                });
            }
            patternsLoaded = true;
        } catch (error) {
            console.error('Failed to load log patterns:', error);
            patternsLoaded = true;
        }
    }

    function highlightLine(line) {
        if (!line) return '';
        if (!patternsLoaded || HIGHLIGHT_RULES.length === 0) return escapeHtml(line);

        const matches = [];
        
        HIGHLIGHT_RULES.forEach(rule => {
            const regex = new RegExp(rule.pattern);
            let match;
            
            while ((match = regex.exec(line)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    className: rule.className
                });
                
                if (match[0].length === 0) {
                    regex.lastIndex++;
                }
            }
        });
        
        matches.sort((a, b) => a.start - b.start);
        
        const filteredMatches = [];
        let lastEnd = 0;
        
        matches.forEach(match => {
            if (match.start >= lastEnd) {
                filteredMatches.push(match);
                lastEnd = match.end;
            }
        });
        
        let result = '';
        let pos = 0;
        
        filteredMatches.forEach(match => {
            if (match.start > pos) {
                result += escapeHtml(line.substring(pos, match.start));
            }
            
            result += `<span class="${match.className}">${escapeHtml(match.text)}</span>`;
            pos = match.end;
        });
        
        if (pos < line.length) {
            result += escapeHtml(line.substring(pos));
        }
        
        return result;
    }
    
    function highlightLines(lines, startLine, endLine) {
        let html = '<div class="log-lines">';
        
        for (let i = startLine - 1; i < endLine && i < lines.length; i++) {
            const lineNumber = i + 1;
            const lineContent = highlightLine(lines[i] || '');
            
            html += `
                <div class="log-line" data-line="${lineNumber}">
                    <span class="log-ln">${lineNumber}</span>
                    <span class="log-txt">${lineContent}</span>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }
    
    window.LogHighlighter = {
        highlightLine,
        highlightLines,
        loadPatterns
    };
    
    loadPatterns();

})();
